"""Avatar storage helpers."""
from pathlib import Path
from typing import Final, Optional
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings

ALLOWED_IMAGE_TYPES: Final[dict[str, str]] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class AvatarServiceError(Exception):
    """An avatar error that is safe to show to application users."""


def is_valid_image_content(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


async def save_avatar_file(avatar: UploadFile, user_id: int) -> str:
    content_type = (avatar.content_type or "").lower()
    extension = ALLOWED_IMAGE_TYPES.get(content_type)
    if not extension:
        raise AvatarServiceError("请上传 JPG、PNG 或 WebP 格式的图片")

    content = await avatar.read(settings.AVATAR_MAX_SIZE_BYTES + 1)
    if not content:
        raise AvatarServiceError("图片文件不能为空")
    if len(content) > settings.AVATAR_MAX_SIZE_BYTES:
        raise AvatarServiceError("头像图片不能超过 5MB")
    if not is_valid_image_content(content, content_type):
        raise AvatarServiceError("图片文件格式不正确")

    filename = f"avatar-{user_id}-{uuid4().hex}{extension}"
    target = settings.AVATAR_UPLOAD_DIR / filename
    target.write_bytes(content)
    return f"/uploads/avatars/{filename}"


def delete_avatar_file(avatar_url: Optional[str], user_id: int) -> None:
    if not avatar_url:
        return

    path = urlparse(avatar_url).path
    prefix = "/uploads/avatars/"
    if not path.startswith(prefix):
        return

    filename = Path(path).name
    if not filename.startswith(f"avatar-{user_id}-"):
        return
    (settings.AVATAR_UPLOAD_DIR / filename).unlink(missing_ok=True)
