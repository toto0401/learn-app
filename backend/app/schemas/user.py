from datetime import datetime
import re
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")


def normalize_phone(value: str) -> str:
    phone = str(value or "").strip()
    if not PHONE_PATTERN.fullmatch(phone):
        raise ValueError("请输入正确的 11 位中国大陆手机号")
    return phone


def normalize_sms_code(value: str) -> str:
    code = str(value or "").strip()
    if not re.fullmatch(r"\d{6}", code):
        raise ValueError("请输入 6 位数字验证码")
    return code


def normalize_username(value: str) -> str:
    return value.strip().lower()


class RegistrationMethod(str, Enum):
    PASSWORD = "password"
    SMS = "sms"


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    phone: str
    sms_code: str
    registration_method: RegistrationMethod = RegistrationMethod.PASSWORD
    password: Optional[str] = None
    nickname: Optional[str] = Field(default=None, max_length=16)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = normalize_username(value)
        if len(value) < 3:
            raise ValueError("账号至少需要 3 个字符")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("sms_code")
    @classmethod
    def validate_sms_code(cls, value: str) -> str:
        return normalize_sms_code(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not 6 <= len(value) <= 32:
            raise ValueError("密码长度需为 6 到 32 位")
        return value

    @model_validator(mode="after")
    def require_password_for_password_registration(self):
        if self.registration_method == RegistrationMethod.PASSWORD and not self.password:
            raise ValueError("密码注册需要设置密码")
        return self

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, value: Optional[str]) -> Optional[str]:
        value = value.strip() if value else None
        return value or None


class UserLogin(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    password: str = Field(min_length=6, max_length=32)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return normalize_username(value)


class PhoneSmsLogin(BaseModel):
    phone: str
    sms_code: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("sms_code")
    @classmethod
    def validate_sms_code(cls, value: str) -> str:
        return normalize_sms_code(value)


class PasswordReset(BaseModel):
    phone: str
    sms_code: str
    new_password: str = Field(min_length=6, max_length=32)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("sms_code")
    @classmethod
    def validate_sms_code(cls, value: str) -> str:
        return normalize_sms_code(value)


class SmsScene(str, Enum):
    REGISTER = "register"
    LOGIN = "login"
    RESET_PASSWORD = "reset_password"


class SmsSendRequest(BaseModel):
    phone: str
    scene: SmsScene

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


class UserPublic(BaseModel):
    id: int
    username: str
    phone: Optional[str]
    nickname: str
    avatar_url: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserNicknameUpdate(BaseModel):
    nickname: str = Field(min_length=1, max_length=16)

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("昵称不能为空")
        return value
