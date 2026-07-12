from datetime import datetime
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    LiveCollaborationParticipant,
    LiveCollaborationSession,
    Project,
    ProjectMember,
    User,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])

ProjectRole = Literal["owner", "editor", "viewer"]
AssignableRole = Literal["editor", "viewer"]


class ProjectPayload(BaseModel):
    name: str = Field(default="Untitled Project", max_length=200)
    thumbnail: str | None = None
    data: dict


class ProjectResponse(ProjectPayload):
    id: str
    createdAt: datetime
    updatedAt: datetime
    role: ProjectRole
    ownerEmail: EmailStr


class InviteMemberPayload(BaseModel):
    email: EmailStr
    role: AssignableRole = "viewer"


class UpdateMemberRolePayload(BaseModel):
    role: AssignableRole


class ProjectMemberResponse(BaseModel):
    id: int
    userId: int
    email: EmailStr
    role: ProjectRole
    createdAt: datetime


def user_role(
    project: Project,
    user: User,
    db: Session,
) -> ProjectRole | None:
    if project.owner_id == user.id:
        return "owner"

    membership = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id,
        )
    )

    if membership and membership.role in ("editor", "viewer"):
        return membership.role  # type: ignore[return-value]

    return None


def accessible_project(
    project_id: str,
    user: User,
    db: Session,
    allowed_roles: tuple[ProjectRole, ...] = (
        "owner",
        "editor",
        "viewer",
    ),
) -> tuple[Project, ProjectRole]:
    project = db.scalar(
        select(Project)
        .options(selectinload(Project.owner))
        .where(Project.id == project_id)
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    role = user_role(project, user, db)

    if role is None:
        # Return 404 rather than exposing that another user's project exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action",
        )

    return project, role


def serialize(
    project: Project,
    role: ProjectRole,
) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        thumbnail=project.thumbnail,
        data=project.data,
        createdAt=project.created_at,
        updatedAt=project.updated_at,
        role=role,
        ownerEmail=project.owner.email,
    )


def serialize_member(
    membership: ProjectMember,
) -> ProjectMemberResponse:
    return ProjectMemberResponse(
        id=membership.id,
        userId=membership.user_id,
        email=membership.user.email,
        role=membership.role,  # type: ignore[arg-type]
        createdAt=membership.created_at,
    )


@router.get(
    "",
    response_model=list[ProjectResponse],
)
def list_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = db.scalars(
        select(Project)
        .options(selectinload(Project.owner))
        .where(
            or_(
                Project.owner_id == user.id,
                Project.members.any(
                    ProjectMember.user_id == user.id
                ),
            )
        )
        .order_by(Project.updated_at.desc())
    ).all()

    return [
        serialize(
            project,
            user_role(project, user, db) or "viewer",
        )
        for project in projects
    ]


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    payload: ProjectPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(
        id=f"project-{uuid4()}",
        owner_id=user.id,
        name=payload.name,
        thumbnail=payload.thumbnail,
        data=payload.data,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    project.owner = user

    return serialize(project, "owner")


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
)
def update_project(
    project_id: str,
    payload: ProjectPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, role = accessible_project(
        project_id,
        user,
        db,
    )

    can_edit = role in ("owner", "editor")
    if not can_edit:
        live_editor = db.scalar(
            select(LiveCollaborationParticipant.id)
            .join(
                LiveCollaborationSession,
                LiveCollaborationSession.id == LiveCollaborationParticipant.session_id,
            )
            .where(
                LiveCollaborationSession.project_id == project_id,
                LiveCollaborationSession.status == "active",
                LiveCollaborationParticipant.user_id == user.id,
                LiveCollaborationParticipant.role == "editor",
            )
        )
        can_edit = live_editor is not None

    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this project",
        )

    project.name = payload.name
    project.thumbnail = payload.thumbnail
    project.data = payload.data

    db.commit()
    db.refresh(project)

    return serialize(project, role)


@router.post(
    "/{project_id}/duplicate",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    original, _ = accessible_project(
        project_id,
        user,
        db,
    )

    original_data = original.data or {}

    duplicated_project = Project(
        id=f"project-{uuid4()}",
        owner_id=user.id,
        name=f"{original.name} Copy",
        thumbnail=original.thumbnail,
        data={
            **original_data,
            "movieTitle": (
                f"{original_data.get('movieTitle') or original.name} Copy"
            ),
        },
    )

    db.add(duplicated_project)
    db.commit()
    db.refresh(duplicated_project)

    duplicated_project.owner = user

    return serialize(duplicated_project, "owner")


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id,
        user,
        db,
        allowed_roles=("owner",),
    )

    db.delete(project)
    db.commit()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponse],
)
def list_project_members(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id,
        user,
        db,
    )

    memberships = db.scalars(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(
            ProjectMember.project_id == project.id
        )
        .order_by(ProjectMember.created_at.asc())
    ).all()

    owner_member = ProjectMemberResponse(
        id=0,
        userId=project.owner.id,
        email=project.owner.email,
        role="owner",
        createdAt=project.created_at,
    )

    return [
        owner_member,
        *[
            serialize_member(member)
            for member in memberships
        ],
    ]


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_project_member(
    project_id: str,
    payload: InviteMemberPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id,
        user,
        db,
        allowed_roles=("owner",),
    )

    normalized_email = payload.email.lower().strip()

    invited_user = db.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )

    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No registered user was found "
                "with that email address"
            ),
        )

    if invited_user.id == project.owner_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The owner is already a member",
        )

    existing_membership = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == invited_user.id,
        )
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member",
        )

    membership = ProjectMember(
        project_id=project.id,
        user_id=invited_user.id,
        role=payload.role,
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    membership.user = invited_user

    return serialize_member(membership)


@router.patch(
    "/{project_id}/members/{member_id}",
    response_model=ProjectMemberResponse,
)
def update_project_member_role(
    project_id: str,
    member_id: int,
    payload: UpdateMemberRolePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id,
        user,
        db,
        allowed_roles=("owner",),
    )

    membership = db.scalar(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project.id,
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found",
        )

    membership.role = payload.role

    db.commit()
    db.refresh(membership)

    return serialize_member(membership)


@router.delete(
    "/{project_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_project_member(
    project_id: str,
    member_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id,
        user,
        db,
        allowed_roles=("owner",),
    )

    membership = db.scalar(
        select(ProjectMember).where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project.id,
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found",
        )

    db.delete(membership)
    db.commit()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )