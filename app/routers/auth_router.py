from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (UserCreate, UserResponse, LoginRequest, TokenResponse)
from app.services.auth_service import (create_user, authenticate_user)
from app.auth.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""

    return create_user(db, user_data)

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT access token."""

    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": str(user.id), "username": user.username, "role": user.role})

    return {"access_token": access_token, "token_type": "bearer"}