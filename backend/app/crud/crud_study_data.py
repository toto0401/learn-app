from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.study_data import StudyData
from app.schemas.study import StudyDataPayload


def get_study_data(db: Session, user_id: int) -> Optional[StudyData]:
    return db.scalar(select(StudyData).where(StudyData.user_id == user_id))


def replace_study_data(db: Session, user_id: int, payload: StudyDataPayload) -> StudyData:
    study_data = get_study_data(db, user_id)
    if not study_data:
        study_data = StudyData(user_id=user_id)

    study_data.tasks = [task.model_dump() for task in payload.tasks]
    study_data.review_cards = [card.model_dump() for card in payload.review_cards]
    study_data.checkin_days = payload.checkin_days
    study_data.review_seconds = payload.review_seconds
    db.add(study_data)
    db.commit()
    db.refresh(study_data)
    return study_data
