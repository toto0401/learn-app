"""Aliyun DYPNS SMS verification service."""
from typing import Dict

from Tea.exceptions import TeaException
from alibabacloud_dypnsapi20170525 import models as dypns_models
from alibabacloud_dypnsapi20170525.client import Client as DypnsClient
from alibabacloud_tea_openapi import models as open_api_models

from app.core.config import settings

_TEMPLATE_CODES: Dict[str, str] = {
    "register": settings.ALIYUN_SMS_TEMPLATE_REGISTER,
    "login": settings.ALIYUN_SMS_TEMPLATE_REGISTER,
    "reset_password": settings.ALIYUN_SMS_TEMPLATE_RESET_PASSWORD,
}
_ERROR_MESSAGES = {
    "MOBILE_NUMBER_ILLEGAL": "手机号格式不正确",
    "BUSINESS_LIMIT_CONTROL": "发送次数超限，请明天再试",
    "FREQUENCY_FAIL": "发送太频繁，请稍后再试",
}


class SmsServiceError(Exception):
    """An SMS error that is safe to show to an application user."""


def _get_client() -> DypnsClient:
    if not settings.has_aliyun_sms_credentials():
        raise SmsServiceError("短信服务尚未配置，请联系管理员")

    config = open_api_models.Config(
        access_key_id=settings.ALIYUN_ACCESS_KEY_ID,
        access_key_secret=settings.ALIYUN_ACCESS_KEY_SECRET,
        endpoint=settings.ALIYUN_DYPNS_ENDPOINT,
        region_id="cn-hangzhou",
    )
    return DypnsClient(config)


def _friendly_error(error: Exception, fallback: str) -> SmsServiceError:
    code = getattr(error, "code", "")
    return SmsServiceError(_ERROR_MESSAGES.get(code, fallback))


def send_sms(phone: str, scene: str) -> None:
    """Ask DYPNS to generate and send a six-digit verification code."""

    template_code = _TEMPLATE_CODES.get(scene)
    if not template_code:
        raise SmsServiceError("不支持的短信验证场景")

    request = dypns_models.SendSmsVerifyCodeRequest(
        phone_number=phone,
        sign_name=settings.ALIYUN_SMS_SIGN_NAME,
        template_code=template_code,
        template_param='{"code":"##code##","min":"5"}',
        code_length=6,
        valid_time=300,
        interval=60,
        code_type=1,
    )
    try:
        _get_client().send_sms_verify_code(request)
    except TeaException as error:
        raise _friendly_error(error, "验证码发送失败，请稍后再试") from error
    except Exception as error:
        raise _friendly_error(error, "短信服务暂时不可用，请稍后再试") from error


def check_sms_code(phone: str, code: str) -> bool:
    """Return whether DYPNS accepts the user-provided verification code."""

    request = dypns_models.CheckSmsVerifyCodeRequest(
        phone_number=phone,
        verify_code=code,
    )
    try:
        response = _get_client().check_sms_verify_code(request)
    except TeaException as error:
        raise _friendly_error(error, "验证码校验失败，请稍后再试") from error
    except Exception as error:
        raise _friendly_error(error, "短信服务暂时不可用，请稍后再试") from error

    model = getattr(getattr(response, "body", None), "model", None)
    return getattr(model, "verify_result", None) == "PASS"
