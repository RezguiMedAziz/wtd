import hashlib
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import get_settings
from .database import get_db
from .models import User

bearer = HTTPBearer(auto_error=False)


def new_token() -> str:
    return secrets.token_urlsafe(32)

def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> None:
    """Admin access with a shared secret (ADMIN_TOKEN). Disabled when no token is configured."""
    expected = get_settings().admin_token
    if not expected:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Admin access is not configured on the server.")
    if not creds or not secrets.compare_digest(creds.credentials.encode(), expected.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid admin token.", headers={"WWW-Authenticate": "Bearer"})

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    """Lightweight session token issued at onboarding (no passwords yet)."""
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing session token.", headers={"WWW-Authenticate": "Bearer"})
    user = db.scalar(select(User).where(User.token_hash == hash_token(creds.credentials)))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session.", headers={"WWW-Authenticate": "Bearer"})
    return user


def optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User | None:
    if not creds:
        return None
    return db.scalar(select(User).where(User.token_hash == hash_token(creds.credentials)))
