from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.user import User
from services.database import get_db
import os
from pathlib import Path

# Create config directory if it doesn't exist
config_dir = Path("config")
config_dir.mkdir(exist_ok=True)

# Secret key for JWT
SECRET_KEY = os.getenv("SECRET_KEY", "abc123neurolab_jwt_secure_secret_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

class AuthService:
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire.timestamp()})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str, db: Session):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
            )
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Doctor user not found",
            )
        return user

    @staticmethod
    def authenticate_user(username: str, password: str, db: Session):
        user = db.query(User).filter(
            (User.username == username) | (User.email == username)
        ).first()
        if not user or not user.verify_password(password):
            return False
        return user

    @staticmethod
    def create_user(
        username: str,
        email: str,
        password: str,
        full_name: str,
        license_number: str,
        specialty: str,
        hospital_affiliation: str,
        role: str,
        db: Session
    ):
        # Check if user already exists
        if db.query(User).filter(User.username == username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor username already registered",
            )
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor email already registered",
            )

        # Create new user
        hashed_password = User.get_password_hash(password)
        db_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name or f"Dr. {username.capitalize()}",
            license_number=license_number or f"MD-{abs(hash(username)) % 90000 + 10000}",
            specialty=specialty or "General Diagnostics",
            hospital_affiliation=hospital_affiliation or "NeuroLab Medical Center",
            role=role or "lead_physician"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def get_all_doctors(db: Session) -> List[User]:
        return db.query(User).all()