from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.game import Game
from app.game_logic.engine import GameEngine

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class GameCreate(BaseModel):
    user_id: int
    difficulty: str = "medium"

class GameAction(BaseModel):
    user_id: int
    action: str
    parameters: Optional[Dict[str, Any]] = None

class GameStateResponse(BaseModel):
    game_id: int
    user_id: int
    difficulty: str
    status: str
    current_location: str
    score: int
    moves_count: int
    game_state: Dict[str, Any]
    
    class Config:
        from_attributes = True

@router.post("/", response_model=GameStateResponse)
async def create_game(game_data: GameCreate, db: Session = Depends(get_db)):
    """Start a new game"""
    try:
        user = db.query(User).filter(User.id == game_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Initialize game engine
        game_engine = GameEngine(difficulty=game_data.difficulty)
        initial_state = game_engine.initialize_game()
        
        # Create game record
        new_game = Game(
            user_id=game_data.user_id,
            difficulty=game_data.difficulty,
            current_location=initial_state["location"],
            game_state=initial_state
        )
        
        db.add(new_game)
        
        # Update user's current game
        user.current_game_id = new_game.id
        user.games_played += 1
        
        db.commit()
        db.refresh(new_game)
        
        logger.info(f"Created new game for user {user.id}")
        return new_game
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating game: {e}")
        raise HTTPException(status_code=500, detail="Failed to create game")

@router.post("/move", response_model=GameStateResponse)
async def make_move(action_data: GameAction, db: Session = Depends(get_db)):
    """Make a move in the game"""
    try:
        user = db.query(User).filter(User.id == action_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.current_game_id:
            raise HTTPException(status_code=400, detail="No active game")
        
        game = db.query(Game).filter(Game.id == user.current_game_id).first()
        if not game or game.status != "active":
            raise HTTPException(status_code=400, detail="No active game")
        
        # Process the action
        game_engine = GameEngine(game.difficulty)
        game_engine.load_state(game.game_state)
        
        result = game_engine.process_action(
            action=action_data.action,
            parameters=action_data.parameters or {}
        )
        
        # Update game state
        game.game_state = game_engine.get_state()
        game.current_location = result.get("location", game.current_location)
        game.moves_count += 1
        game.score += result.get("score_change", 0)
        
        # Check if game is completed
        if result.get("game_completed"):
            game.status = "completed"
            user.wins += 1
            # Award experience
            experience_gained = 100 * (1 + (["easy", "medium", "hard"].index(game.difficulty) * 0.5))
            user.experience += experience_gained
        
        db.commit()
        db.refresh(game)
        
        return game
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing move: {e}")
        raise HTTPException(status_code=500, detail="Failed to process move")

@router.get("/{game_id}", response_model=GameStateResponse)
async def get_game(game_id: int, db: Session = Depends(get_db)):
    """Get game by ID"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

@router.get("/user/{user_id}/active")
async def get_active_game(user_id: int, db: Session = Depends(get_db)):
    """Get user's active game"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.current_game_id:
        return None
    
    game = db.query(Game).filter(Game.id == user.current_game_id).first()
    if not game or game.status != "active":
        user.current_game_id = None
        db.commit()
        return None
    
    return game

@router.post("/{game_id}/quit")
async def quit_game(game_id: int, db: Session = Depends(get_db)):
    """Quit a game"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.status == "active":
        game.status = "abandoned"
        
        # Clear user's current game
        user = db.query(User).filter(User.id == game.user_id).first()
        if user and user.current_game_id == game_id:
            user.current_game_id = None
        
        db.commit()
    
    return {"message": "Game quit successfully"}
