from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Optional
from secrets import token_urlsafe

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserRegister


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.scalar(select(User).where(User.username == username))


def get_user_by_phone(db: Session, phone: str) -> Optional[User]:
    return db.scalar(select(User).where(User.phone == phone))


def create_user(db: Session, user_in: UserRegister) -> User:
    user = User(
        username=user_in.username,
        phone=user_in.phone,
        # Usernames may be longer than the 16-character display-name column.
        nickname=user_in.nickname or user_in.username[:16],
        hashed_password=get_password_hash(user_in.password or token_urlsafe(32)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_password(db: Session, user: User, new_password: str) -> User:
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_avatar(db: Session, user: User, avatar_url: Optional[str]) -> User:
    user.avatar_url = avatar_url
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_nickname(db: Session, user: User, nickname: str) -> User:
    user.nickname = nickname
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
