from collections import defaultdict
from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class ProjectConnection:
    websocket: WebSocket
    user_id: int
    email: str
    role: str


class ProjectConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[ProjectConnection]] = defaultdict(list)

    async def connect(
        self,
        project_id: str,
        websocket: WebSocket,
        *,
        user_id: int,
        email: str,
        role: str,
    ) -> ProjectConnection:
        await websocket.accept()
        connection = ProjectConnection(
            websocket=websocket,
            user_id=user_id,
            email=email,
            role=role,
        )
        self.active_connections[project_id].append(connection)
        return connection

    def disconnect(self, project_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(project_id, [])
        remaining = [
            connection
            for connection in connections
            if connection.websocket is not websocket
        ]

        if remaining:
            self.active_connections[project_id] = remaining
        else:
            self.active_connections.pop(project_id, None)

    def presence(self, project_id: str) -> list[dict]:
        unique_users: dict[int, dict] = {}
        for connection in self.active_connections.get(project_id, []):
            unique_users[connection.user_id] = {
                "userId": connection.user_id,
                "email": connection.email,
                "role": connection.role,
            }
        return list(unique_users.values())

    async def broadcast(
        self,
        project_id: str,
        payload: dict,
        *,
        exclude: WebSocket | None = None,
    ) -> None:
        disconnected: list[WebSocket] = []

        for connection in list(self.active_connections.get(project_id, [])):
            if exclude is not None and connection.websocket is exclude:
                continue

            try:
                await connection.websocket.send_json(payload)
            except Exception:
                disconnected.append(connection.websocket)

        for websocket in disconnected:
            self.disconnect(project_id, websocket)

    async def broadcast_presence(self, project_id: str) -> None:
        await self.broadcast(
            project_id,
            {
                "event": "presence",
                "users": self.presence(project_id),
            },
        )


project_websocket_manager = ProjectConnectionManager()