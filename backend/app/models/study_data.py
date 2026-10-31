from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class StudyData(Base):
    """The client-managed study state belonging to one user."""

    __tablename__ = "study_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    tasks: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    review_cards: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    checkin_days: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    review_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
