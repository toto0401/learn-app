import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
WEEK_KEY_PATTERN = re.compile(r"^\d{4}-W\d{2}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def normalize_id(value: str) -> str:
    value = str(value or "").strip()
    if not ID_PATTERN.fullmatch(value):
        raise ValueError("数据 ID 格式不正确")
    return value


class PlannerTaskData(BaseModel):
    id: str
    subject: str = Field(default="", max_length=64)
    description: str = Field(min_length=1, max_length=500)
    duration: int = Field(ge=1, le=1440)
    done: bool = False
    elapsed: int = Field(default=0, ge=0, le=86400)
    weekKey: str
    dayIndex: int = Field(ge=0, le=6)

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        return normalize_id(value)

    @field_validator("subject", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("weekKey")
    @classmethod
    def validate_week_key(cls, value: str) -> str:
        value = value.strip()
        if not WEEK_KEY_PATTERN.fullmatch(value):
            raise ValueError("任务周次格式不正确")
        return value


class ReviewCardData(BaseModel):
    id: str
    front: str = Field(min_length=1, max_length=500)
    back: str = Field(min_length=1, max_length=2000)
    subject: str = Field(default="", max_length=64)
    createdAt: int = Field(ge=0, le=4102444800000)
    nextReview: int = Field(ge=0, le=4102444800000)
    interval: int = Field(default=0, ge=0, le=36500)
    ease: float = Field(default=2.5, ge=1.3, le=10)
    reviewCount: int = Field(default=0, ge=0, le=100000)
    memoryStatus: Literal["未复习", "未记住", "记得不牢", "已记住", "很熟悉"] = "未复习"

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        return normalize_id(value)

    @field_validator("front", "back", "subject")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class StudyDataPayload(BaseModel):
    tasks: list[PlannerTaskData] = Field(default_factory=list, max_length=2000)
    review_cards: list[ReviewCardData] = Field(default_factory=list, max_length=5000)
    checkin_days: list[str] = Field(default_factory=list, max_length=36600)
    review_seconds: int = Field(default=0, ge=0, le=315360000)

    @field_validator("checkin_days")
    @classmethod
    def validate_checkin_days(cls, value: list[str]) -> list[str]:
        normalized = []
        for day in value:
            day = str(day).strip()
            if not DATE_PATTERN.fullmatch(day):
                raise ValueError("打卡日期格式不正确")
            normalized.append(day)
        return sorted(set(normalized))

    @model_validator(mode="after")
    def ensure_unique_ids(self):
        task_ids = [task.id for task in self.tasks]
        card_ids = [card.id for card in self.review_cards]
        if len(task_ids) != len(set(task_ids)):
            raise ValueError("任务数据中存在重复 ID")
        if len(card_ids) != len(set(card_ids)):
            raise ValueError("复习卡数据中存在重复 ID")
        return self


class StudyDataResponse(StudyDataPayload):
    initialized: bool
    updated_at: Optional[datetime] = None
