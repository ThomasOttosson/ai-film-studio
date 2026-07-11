from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..database import get_db
from ..models import Project, User

router = APIRouter(prefix='/api/projects', tags=['Projects'])
class ProjectPayload(BaseModel):
    name: str = Field(default='Untitled Project', max_length=200)
    thumbnail: str | None = None
    data: dict
class ProjectResponse(ProjectPayload):
    id: str
    createdAt: datetime
    updatedAt: datetime

def serialize(project: Project):
    return ProjectResponse(id=project.id, name=project.name, thumbnail=project.thumbnail, data=project.data, createdAt=project.created_at, updatedAt=project.updated_at)
def owned_project(project_id: str, user: User, db: Session):
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    if not project: raise HTTPException(status_code=404, detail='Project not found')
    return project

@router.get('', response_model=list[ProjectResponse])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.scalars(select(Project).where(Project.owner_id == user.id).order_by(Project.updated_at.desc())).all()
    return [serialize(p) for p in projects]
@router.post('', response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(id=f'project-{uuid4()}', owner_id=user.id, name=payload.name, thumbnail=payload.thumbnail, data=payload.data)
    db.add(project); db.commit(); db.refresh(project); return serialize(project)
@router.put('/{project_id}', response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = owned_project(project_id, user, db); project.name=payload.name; project.thumbnail=payload.thumbnail; project.data=payload.data
    db.commit(); db.refresh(project); return serialize(project)
@router.post('/{project_id}/duplicate', response_model=ProjectResponse, status_code=201)
def duplicate_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    original=owned_project(project_id,user,db); copy=Project(id=f'project-{uuid4()}', owner_id=user.id, name=f'{original.name} Copy', thumbnail=original.thumbnail, data={**original.data, 'movieTitle': f"{original.data.get('movieTitle') or original.name} Copy"})
    db.add(copy); db.commit(); db.refresh(copy); return serialize(copy)
@router.delete('/{project_id}', status_code=204)
def delete_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project=owned_project(project_id,user,db); db.delete(project); db.commit()