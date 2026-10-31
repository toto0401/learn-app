from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.core.security import create_access_token
from app.crud.crud_user import (
    authenticate_user,
    create_user,
    get_user_by_phone,
    get_user_by_username,
    update_user_avatar,
    update_user_nickname,
    update_user_password,
)
from app.schemas.auth import MessageResponse, TokenResponse
from app.schemas.user import (
    PasswordReset,
    PhoneSmsLogin,
    SmsScene,
    SmsSendRequest,
    UserLogin,
    UserNicknameUpdate,
    UserPublic,
    UserRegister,
)
from app.services.avatar import AvatarServiceError, delete_avatar_file, save_avatar_file
from app.services.sms import SmsServiceError, check_sms_code, send_sms

router = APIRouter(prefix="/auth", tags=["认证"])


def build_token_response(user) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.username),
        user=UserPublic.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: DbSession) -> TokenResponse:
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="这个账号已经注册过了")
    if get_user_by_phone(db, user_in.phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该手机号已经注册过了")
    try:
        verified = check_sms_code(user_in.phone, user_in.sms_code)
    except SmsServiceError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码不正确或已过期")

    try:
        user = create_user(db, user_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="账号或手机号已经注册过了")
    return build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: DbSession) -> TokenResponse:
    if not get_user_by_username(db, credentials.username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账号尚未注册，请先注册")
    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密码不正确")
    return build_token_response(user)


@router.post("/login-by-sms", response_model=TokenResponse)
def login_by_sms(payload: PhoneSmsLogin, db: DbSession) -> TokenResponse:
    user = get_user_by_phone(db, payload.phone)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该手机号尚未注册")
    try:
        verified = check_sms_code(payload.phone, payload.sms_code)
    except SmsServiceError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码不正确或已过期")
    return build_token_response(user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: PasswordReset, db: DbSession) -> MessageResponse:
    user = get_user_by_phone(db, payload.phone)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该手机号尚未注册")
    try:
        verified = check_sms_code(payload.phone, payload.sms_code)
    except SmsServiceError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码不正确或已过期")
    update_user_password(db, user, payload.new_password)
    return MessageResponse(message="密码已重置，请使用新密码登录")


@router.post("/send-sms", response_model=MessageResponse)
def send_sms_code(payload: SmsSendRequest, db: DbSession) -> MessageResponse:
    existing_user = get_user_by_phone(db, payload.phone)
    if payload.scene == SmsScene.REGISTER and existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该手机号已经注册过了")
    if payload.scene in {SmsScene.LOGIN, SmsScene.RESET_PASSWORD} and not existing_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该手机号尚未注册")
    try:
        send_sms(payload.phone, payload.scene.value)
    except SmsServiceError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    return MessageResponse(message="验证码已发送，请在 5 分钟内完成验证")


@router.get("/me", response_model=UserPublic)
def read_current_user(current_user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate(current_user)


@router.put("/me/nickname", response_model=UserPublic)
def update_current_user_nickname(
    payload: UserNicknameUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> UserPublic:
    user = update_user_nickname(db, current_user, payload.nickname)
    return UserPublic.model_validate(user)


@router.put("/me/avatar", response_model=UserPublic)
async def upload_current_user_avatar(
    db: DbSession,
    current_user: CurrentUser,
    avatar: UploadFile = File(...),
) -> UserPublic:
    try:
        avatar_url = await save_avatar_file(avatar, current_user.id)
    except AvatarServiceError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    finally:
        await avatar.close()

    previous_avatar_url = current_user.avatar_url
    try:
        user = update_user_avatar(db, current_user, avatar_url)
    except Exception as error:
        delete_avatar_file(avatar_url, current_user.id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="头像保存失败，请稍后再试") from error

    delete_avatar_file(previous_avatar_url, current_user.id)
    return UserPublic.model_validate(user)


@router.delete("/me/avatar", response_model=UserPublic)
def delete_current_user_avatar(
    db: DbSession,
    current_user: CurrentUser,
) -> UserPublic:
    previous_avatar_url = current_user.avatar_url
    user = update_user_avatar(db, current_user, None)
    delete_avatar_file(previous_avatar_url, current_user.id)
    return UserPublic.model_validate(user)
