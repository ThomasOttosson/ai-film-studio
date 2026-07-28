import os
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

_INSECURE_JWT_DEFAULT = 'change-me-in-production'


def _require_secret_key() -> str:
    """Fail fast if the JWT signing secret is missing or the known default.

    An unset or default secret means anyone can forge tokens, so refuse to
    start rather than run insecurely. Local dev works via backend/.env.
    """
    secret = os.getenv('JWT_SECRET_KEY')
    if not secret or secret == _INSECURE_JWT_DEFAULT:
        raise RuntimeError(
            'JWT_SECRET_KEY is missing or set to the insecure default '
            f"'{_INSECURE_JWT_DEFAULT}'. Set a strong random value in "
            'backend/.env — generate one with: '
            'python -c "import secrets; print(secrets.token_urlsafe(64))"'
        )
    return secret


SECRET_KEY = _require_secret_key()
ALGORITHM = 'HS256'
ACCESS_TOKEN_MINUTES = int(os.getenv('ACCESS_TOKEN_MINUTES', '1440'))
password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({'sub': str(user.id), 'email': user.email, 'iat': now, 'exp': now + timedelta(minutes=ACCESS_TOKEN_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload['sub'])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token') from exc


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentication required')
    user = db.get(User, decode_token(credentials.credentials))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
    return user
