from datetime import datetime
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from live_collaboration_manager import live_collaboration_manager
from ..auth import get_current_user
from ..database import get_db
from ..notifications import create_notification
from ..models import (
    LiveCollaborationInvitation,
    LiveCollaborationParticipant,
    LiveCollaborationSession,
    Project,
    ProjectMember,
    User,
    utcnow,
)

router = APIRouter(prefix="/api/live-collaboration", tags=["Live Collaboration"])

CollaborationRole = Literal["editor", "viewer"]
InvitationStatus = Literal["pending", "accepted", "declined"]
SessionStatus = Literal["active", "closed"]


class CreateSessionPayload(BaseModel):
    projectId: str


class InvitePayload(BaseModel):
    userId: int
    role: CollaborationRole


class RespondPayload(BaseModel):
    response: Literal["accepted", "declined"]


class UpdateParticipantRolePayload(BaseModel):
    role: CollaborationRole


class EligibleUserResponse(BaseModel):
    userId: int
    email: str
    projectRole: CollaborationRole


class ParticipantResponse(BaseModel):
    id: int
    userId: int
    email: str
    role: CollaborationRole
    joinedAt: datetime


class InvitationResponse(BaseModel):
    id: int
    sessionId: str
    projectId: str
    projectName: str
    invitedUserId: int
    invitedUserEmail: str
    invitedByEmail: str
    role: CollaborationRole
    status: InvitationStatus
    createdAt: datetime
    respondedAt: datetime | None


class SessionResponse(BaseModel):
    id: str
    projectId: str
    projectName: str
    createdBy: int
    createdByEmail: str
    status: SessionStatus
    createdAt: datetime
    closedAt: datetime | None
    invitations: list[InvitationResponse]
    participants: list[ParticipantResponse]


def _project_for_owner(project_id: str, user: User, db: Session) -> Project:
    project = db.scalar(select(Project).options(selectinload(Project.owner)).where(Project.id == project_id))
    if not project or project.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _serialize_invitation(invitation: LiveCollaborationInvitation) -> InvitationResponse:
    session = invitation.session
    return InvitationResponse(
        id=invitation.id,
        sessionId=session.id,
        projectId=session.project_id,
        projectName=session.project.name,
        invitedUserId=invitation.invited_user_id,
        invitedUserEmail=invitation.invited_user.email,
        invitedByEmail=session.creator.email,
        role=invitation.role,
        status=invitation.status,
        createdAt=invitation.created_at,
        respondedAt=invitation.responded_at,
    )


def _serialize_participant(participant: LiveCollaborationParticipant) -> ParticipantResponse:
    return ParticipantResponse(
        id=participant.id,
        userId=participant.user_id,
        email=participant.user.email,
        role=participant.role,
        joinedAt=participant.joined_at,
    )


def _serialize_session(session: LiveCollaborationSession) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        projectId=session.project_id,
        projectName=session.project.name,
        createdBy=session.created_by,
        createdByEmail=session.creator.email,
        status=session.status,
        createdAt=session.created_at,
        closedAt=session.closed_at,
        invitations=[_serialize_invitation(item) for item in session.invitations],
        participants=[_serialize_participant(item) for item in session.participants],
    )


def _load_session(session_id: str, db: Session) -> LiveCollaborationSession | None:
    return db.scalar(
        select(LiveCollaborationSession)
        .options(
            selectinload(LiveCollaborationSession.project),
            selectinload(LiveCollaborationSession.creator),
            selectinload(LiveCollaborationSession.invitations).selectinload(LiveCollaborationInvitation.invited_user),
            selectinload(LiveCollaborationSession.participants).selectinload(LiveCollaborationParticipant.user),
        )
        .where(LiveCollaborationSession.id == session_id)
    )


@router.get("/eligible-users/{project_id}", response_model=list[EligibleUserResponse])
def eligible_users(
    project_id: str,
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=10, ge=1, le=25),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _project_for_owner(project_id, user, db)
    query = (
        select(ProjectMember)
        .join(ProjectMember.user)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.project_id == project.id)
        .order_by(User.email.asc())
        .limit(limit)
    )
    normalized_query = q.strip().lower()
    if normalized_query:
        query = query.where(User.email.ilike(f"%{normalized_query}%"))
    memberships = db.scalars(query).all()
    return [
        EligibleUserResponse(
            userId=membership.user_id,
            email=membership.user.email,
            projectRole=membership.role,
        )
        for membership in memberships
    ]


@router.post("/sessions", response_model=SessionResponse, status_code=201)
def create_session(payload: CreateSessionPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _project_for_owner(payload.projectId, user, db)
    existing = db.scalar(select(LiveCollaborationSession).where(
        LiveCollaborationSession.project_id == project.id,
        LiveCollaborationSession.status == "active",
    ))
    if existing:
        loaded = _load_session(existing.id, db)
        assert loaded is not None
        return _serialize_session(loaded)
    session = LiveCollaborationSession(id=f"live-{uuid4()}", project_id=project.id, created_by=user.id, status="active")
    db.add(session)
    db.commit()
    loaded = _load_session(session.id, db)
    assert loaded is not None
    return _serialize_session(loaded)


@router.get("/sessions/project/{project_id}", response_model=SessionResponse | None)
def get_active_project_session(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    has_access = project.owner_id == user.id or db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id,
    )) is not None
    if not has_access:
        raise HTTPException(status_code=404, detail="Project not found")
    session = db.scalar(select(LiveCollaborationSession).where(
        LiveCollaborationSession.project_id == project.id,
        LiveCollaborationSession.status == "active",
    ))
    if not session:
        return None
    loaded = _load_session(session.id, db)
    assert loaded is not None
    return _serialize_session(loaded)


@router.post("/sessions/{session_id}/invitations", response_model=InvitationResponse, status_code=201)
def invite_user(session_id: str, payload: InvitePayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _load_session(session_id, db)
    if not session or session.status != "active" or session.created_by != user.id:
        raise HTTPException(status_code=404, detail="Live collaboration session not found")
    member = db.scalar(select(ProjectMember).where(
        ProjectMember.project_id == session.project_id,
        ProjectMember.user_id == payload.userId,
    ))
    if not member:
        raise HTTPException(status_code=400, detail="User must be a project member first")
    existing = db.scalar(select(LiveCollaborationInvitation).where(
        LiveCollaborationInvitation.session_id == session.id,
        LiveCollaborationInvitation.invited_user_id == payload.userId,
    ))
    if existing:
        if existing.status in ("declined", "pending"):
            existing.status = "pending"
            existing.role = payload.role
            existing.responded_at = None
            db.commit()
            loaded = _load_session(session.id, db)
            assert loaded is not None
            return _serialize_invitation(next(item for item in loaded.invitations if item.id == existing.id))
        raise HTTPException(status_code=409, detail="User already accepted this session")
    invitation = LiveCollaborationInvitation(
        session_id=session.id,
        invited_user_id=payload.userId,
        role=payload.role,
        status="pending",
    )
    db.add(invitation)
    invited_user = db.get(User, payload.userId)
    if invited_user:
        create_notification(
            db,
            user_id=invited_user.id,
            notification_type="live_collaboration_invitation",
            title="Live collaboration invitation",
            message=f"{user.email} invited you to collaborate on {session.project.name} as {payload.role}.",
            data={
                "sessionId": session.id,
                "projectId": session.project_id,
                "projectName": session.project.name,
                "role": payload.role,
                "invitedBy": user.email,
            },
        )
    db.commit()
    loaded = _load_session(session.id, db)
    assert loaded is not None
    return _serialize_invitation(next(item for item in loaded.invitations if item.invited_user_id == payload.userId))


@router.get("/invitations", response_model=list[InvitationResponse])
def my_invitations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invitations = db.scalars(
        select(LiveCollaborationInvitation)
        .options(
            selectinload(LiveCollaborationInvitation.invited_user),
            selectinload(LiveCollaborationInvitation.session).selectinload(LiveCollaborationSession.project),
            selectinload(LiveCollaborationInvitation.session).selectinload(LiveCollaborationSession.creator),
        )
        .where(
            LiveCollaborationInvitation.invited_user_id == user.id,
            LiveCollaborationInvitation.status == "pending",
            LiveCollaborationInvitation.session.has(status="active"),
        )
        .order_by(LiveCollaborationInvitation.created_at.desc())
    ).all()
    return [_serialize_invitation(item) for item in invitations]


@router.patch("/invitations/{invitation_id}", response_model=InvitationResponse)
def respond_to_invitation(invitation_id: int, payload: RespondPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invitation = db.scalar(select(LiveCollaborationInvitation).where(
        LiveCollaborationInvitation.id == invitation_id,
        LiveCollaborationInvitation.invited_user_id == user.id,
    ))
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.status != "pending":
        raise HTTPException(status_code=409, detail="Invitation has already been answered")
    invitation.status = payload.response
    invitation.responded_at = utcnow()
    if payload.response == "accepted":
        participant = db.scalar(select(LiveCollaborationParticipant).where(
            LiveCollaborationParticipant.session_id == invitation.session_id,
            LiveCollaborationParticipant.user_id == user.id,
        ))
        if participant:
            participant.role = invitation.role
        else:
            db.add(LiveCollaborationParticipant(
                session_id=invitation.session_id,
                user_id=user.id,
                role=invitation.role,
            ))
    session_owner_id = invitation.session.created_by if invitation.session else None
    if session_owner_id is not None:
        create_notification(
            db,
            user_id=session_owner_id,
            notification_type=f"live_collaboration_{payload.response}",
            title=f"Live invitation {payload.response}",
            message=f"{user.email} {payload.response} your invitation to {invitation.session.project.name}.",
            data={
                "sessionId": invitation.session_id,
                "projectId": invitation.session.project_id,
                "projectName": invitation.session.project.name,
                "respondedBy": user.email,
                "response": payload.response,
            },
        )
    db.commit()
    session = _load_session(invitation.session_id, db)
    assert session is not None
    return _serialize_invitation(next(item for item in session.invitations if item.id == invitation.id))


@router.patch("/sessions/{session_id}/participants/{participant_id}", response_model=ParticipantResponse)
async def update_participant_role(
    session_id: str,
    participant_id: int,
    payload: UpdateParticipantRolePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(LiveCollaborationSession, session_id)
    if not session or session.created_by != user.id or session.status != "active":
        raise HTTPException(status_code=404, detail="Session not found")
    participant = db.scalar(select(LiveCollaborationParticipant).options(selectinload(LiveCollaborationParticipant.user)).where(
        LiveCollaborationParticipant.id == participant_id,
        LiveCollaborationParticipant.session_id == session_id,
    ))
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    participant.role = payload.role
    db.commit()
    db.refresh(participant)
    await live_collaboration_manager.broadcast(session_id, {
        "event": "role_changed",
        "userId": participant.user_id,
        "role": participant.role,
    })
    return _serialize_participant(participant)


@router.delete("/sessions/{session_id}/participants/{participant_id}", status_code=204)
async def remove_participant(
    session_id: str,
    participant_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(LiveCollaborationSession, session_id)
    if not session or session.created_by != user.id or session.status != "active":
        raise HTTPException(status_code=404, detail="Session not found")
    participant = db.scalar(select(LiveCollaborationParticipant).where(
        LiveCollaborationParticipant.id == participant_id,
        LiveCollaborationParticipant.session_id == session_id,
    ))
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    removed_user_id = participant.user_id
    db.delete(participant)
    db.commit()
    await live_collaboration_manager.broadcast(session_id, {
        "event": "participant_removed",
        "userId": removed_user_id,
    })
    await live_collaboration_manager.disconnect_user(session_id, removed_user_id, code=4403, reason="Removed from live session")
    return Response(status_code=204)


@router.delete("/sessions/{session_id}/invitations/{invitation_id}", status_code=204)
def revoke_invitation(session_id: str, invitation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(LiveCollaborationSession, session_id)
    if not session or session.created_by != user.id or session.status != "active":
        raise HTTPException(status_code=404, detail="Session not found")
    invitation = db.scalar(select(LiveCollaborationInvitation).where(
        LiveCollaborationInvitation.id == invitation_id,
        LiveCollaborationInvitation.session_id == session_id,
    ))
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    db.delete(invitation)
    db.commit()
    return Response(status_code=204)


@router.post("/sessions/{session_id}/leave", status_code=204)
async def leave_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(LiveCollaborationSession, session_id)
    if not session or session.status != "active":
        raise HTTPException(status_code=404, detail="Session not found")

    if session.created_by == user.id:
        raise HTTPException(
            status_code=400,
            detail="The session owner must close the session instead",
        )

    participant = db.scalar(
        select(LiveCollaborationParticipant).where(
            LiveCollaborationParticipant.session_id == session_id,
            LiveCollaborationParticipant.user_id == user.id,
        )
    )
    if not participant:
        raise HTTPException(status_code=404, detail="You are not part of this session")

    removed_user_id = participant.user_id
    db.delete(participant)
    db.commit()

    await live_collaboration_manager.broadcast(
        session_id,
        {
            "event": "participant_removed",
            "userId": removed_user_id,
        },
    )
    await live_collaboration_manager.disconnect_user(
        session_id,
        removed_user_id,
        code=1000,
        reason="Left live collaboration session",
    )

    return Response(status_code=204)


@router.post("/sessions/{session_id}/close", response_model=SessionResponse)
async def close_session(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(LiveCollaborationSession, session_id)
    if not session or session.created_by != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "closed"
    session.closed_at = utcnow()
    db.commit()
    await live_collaboration_manager.close_session(session_id)
    loaded = _load_session(session.id, db)
    assert loaded is not None
    return _serialize_session(loaded)