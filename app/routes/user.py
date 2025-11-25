from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.inventory import InventoryItem

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models for request/response
from pydantic import BaseModel

class UserCreate(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    level: int
    experience: float
    games_played: int
    wins: int
    coins: int
    health: int
    max_health: int
    
    class Config:
        from_attributes = True

class InventoryItemResponse(BaseModel):
    id: int
    item_type: str
    item_name: str
    quantity: int
    attributes: dict
    
    class Config:
        from_attributes = True

@router.post("/", response_model=UserResponse)
async def create_or_get_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user or return existing one"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.telegram_id == user_data.telegram_id).first()
        
        if existing_user:
            return existing_user
        
        # Create new user
        new_user = User(
            telegram_id=user_data.telegram_id,
            username=user_data.username,
            first_name=user_data.first_name,
            last_name=user_data.last_name
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"Created new user: {new_user.telegram_id}")
        return new_user
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/telegram/{telegram_id}", response_model=UserResponse)
async def get_user_by_telegram(telegram_id: int, db: Session = Depends(get_db)):
    """Get user by Telegram ID"""
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{user_id}/inventory", response_model=List[InventoryItemResponse])
async def get_user_inventory(user_id: int, db: Session = Depends(get_db)):
    """Get user's inventory"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user.inventory

@router.post("/{user_id}/add-coins")
async def add_coins(user_id: int, amount: int, db: Session = Depends(get_db)):
    """Add coins to user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.coins += amount
    db.commit()
    
    return {"message": f"Added {amount} coins", "new_balance": user.coins}

@router.post("/{user_id}/add-experience")
async def add_experience(user_id: int, amount: float, db: Session = Depends(get_db)):
    """Add experience to user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.experience += amount
    
    # Level up logic
    exp_needed = user.level * 100
    while user.experience >= exp_needed:
        user.experience -= exp_needed
        user.level += 1
        exp_needed = user.level * 100
    
    db.commit()
    
    return {"message": f"Added {amount} XP", "level": user.level, "experience": user.experience}
