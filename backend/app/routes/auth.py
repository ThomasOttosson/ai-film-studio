from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..database import get_db
from ..models import User

router = APIRouter(prefix='/api/auth', tags=['Authentication'])


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: EmailStr


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserResponse


@router.post('/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: Credentials, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return AuthResponse(access_token=create_access_token(user), user=UserResponse(id=user.id, email=user.email))


@router.post('/login', response_model=AuthResponse)
def login(payload: Credentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Incorrect email or password')
    return AuthResponse(access_token=create_access_token(user), user=UserResponse(id=user.id, email=user.email))


@router.get('/me', response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, email=user.email)
