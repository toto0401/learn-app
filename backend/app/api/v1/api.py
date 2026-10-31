from fastapi import APIRouter

from app.api.v1.endpoints import auth, study, translation

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(study.router)
api_router.include_router(translation.router)
