from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserCreated, UserIn, UserOut
from ..security import current_user, hash_token, new_token

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserCreated, status_code=status.HTTP_201_CREATED)
def create_user(body: UserIn, db: Session = Depends(get_db)):
    """Onboarding. Stores the profile and returns a session token the frontend sends as `Authorization: Bearer`."""
    token = new_token()
    user = User(**body.model_dump(), token_hash=hash_token(token))
    db.add(user)
    db.commit()
    return UserCreated(user=UserOut.model_validate(user), token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(body: UserIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump().items():
        setattr(user, k, v)
    db.commit()
    return user
