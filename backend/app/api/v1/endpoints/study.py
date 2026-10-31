from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.crud.crud_study_data import get_study_data, replace_study_data
from app.schemas.study import StudyDataPayload, StudyDataResponse

router = APIRouter(prefix="/study-data", tags=["学习数据"])


def build_response(study_data) -> StudyDataResponse:
    if not study_data:
        return StudyDataResponse(initialized=False)
    return StudyDataResponse(
        tasks=study_data.tasks or [],
        review_cards=study_data.review_cards or [],
        checkin_days=study_data.checkin_days or [],
        review_seconds=study_data.review_seconds or 0,
        initialized=True,
        updated_at=study_data.updated_at,
    )


@router.get("", response_model=StudyDataResponse)
def read_study_data(db: DbSession, current_user: CurrentUser) -> StudyDataResponse:
    return build_response(get_study_data(db, current_user.id))


@router.put("", response_model=StudyDataResponse)
def save_study_data(
    payload: StudyDataPayload,
    db: DbSession,
    current_user: CurrentUser,
) -> StudyDataResponse:
    return build_response(replace_study_data(db, current_user.id, payload))
