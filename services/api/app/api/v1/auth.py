from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import CurrentUser
from app.schemas.identity import CurrentUserRead
from app.services.identity import IdentityService

router = APIRouter(prefix="/auth", tags=["identity"])


@router.get("/me", response_model=CurrentUserRead)
def get_me(actor: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> CurrentUserRead:
    return IdentityService(db).current_user(actor)
