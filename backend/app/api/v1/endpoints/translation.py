from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser
from app.schemas.translation import TranslationRequest, TranslationResponse
from app.services.translation import TranslationProviderError, translate_english_to_chinese

router = APIRouter(prefix="/translate", tags=["翻译"])


@router.post("", response_model=TranslationResponse)
def translate_text(payload: TranslationRequest, _current_user: CurrentUser) -> TranslationResponse:
    try:
        return TranslationResponse(translation=translate_english_to_chinese(payload.text))
    except TranslationProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="词典服务暂时不可用，请稍后重试",
        ) from exc
