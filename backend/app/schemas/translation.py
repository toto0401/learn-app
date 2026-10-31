from pydantic import BaseModel, Field, field_validator


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("请输入需要翻译的内容")
        return value


class TranslationResponse(BaseModel):
    translation: str
