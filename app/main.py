# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import from our packages
from app.core.config import settings
from app.core.database import create_tables
from app.routes import users_router, games_router, auth_router

# Create tables on startup
create_tables()

# Create FastAPI app instance - THIS MUST BE NAMED 'app'
app = FastAPI(title="Telegram Game Bot API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(games_router, prefix="/api/games", tags=["games"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Telegram Game Bot API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
