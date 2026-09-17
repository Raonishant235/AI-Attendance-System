from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.auth import UserCreate
from app.auth.security import hash_password, verify_password

def create_user(db: Session, user_data: UserCreate):
    """Create a new user with a securely hashed password."""

    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(username = user_data.username, email = user_data.email, hashed_password = hash_password(user_data.password), is_active = True, role = "teacher")

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

def authenticate_user(db: Session, username: str, password: str):
    """Verify username and password."""

    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None

    return user