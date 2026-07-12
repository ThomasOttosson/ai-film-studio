from collections import defaultdict

from fastapi import WebSocket


class LiveCollaborationManager:
    def __init__(self):
        self.connections: dict[str, dict[int, set[WebSocket]]] = defaultdict(
            lambda: defaultdict(set)
        )

    async def connect(self, session_id: str, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections[session_id][user_id].add(websocket)
        await self.broadcast_presence(session_id)

    async def disconnect(self, session_id: str, user_id: int, websocket: WebSocket):
        user_connections = self.connections.get(session_id, {}).get(user_id)
        if user_connections is not None:
            user_connections.discard(websocket)
            if not user_connections:
                self.connections[session_id].pop(user_id, None)

        if session_id in self.connections and not self.connections[session_id]:
            self.connections.pop(session_id, None)
        else:
            await self.broadcast_presence(session_id)

    async def disconnect_user(
        self,
        session_id: str,
        user_id: int,
        code: int = 1000,
        reason: str = "Disconnected",
    ):
        sockets = list(self.connections.get(session_id, {}).get(user_id, set()))
        for socket in sockets:
            try:
                await socket.close(code=code, reason=reason)
            except Exception:
                pass
            await self.disconnect(session_id, user_id, socket)

    async def close_session(self, session_id: str):
        users = list(self.connections.get(session_id, {}).keys())
        for user_id in users:
            await self.disconnect_user(
                session_id,
                user_id,
                code=4404,
                reason="Live collaboration session closed",
            )

    async def broadcast_presence(self, session_id: str):
        await self.broadcast(
            session_id,
            {
                "event": "presence",
                "onlineUserIds": list(self.connections.get(session_id, {}).keys()),
            },
        )

    async def broadcast(
        self,
        session_id: str,
        message: dict,
        exclude: WebSocket | None = None,
    ):
        stale: list[tuple[int, WebSocket]] = []
        for user_id, sockets in list(self.connections.get(session_id, {}).items()):
            for socket in list(sockets):
                if socket is exclude:
                    continue
                try:
                    await socket.send_json(message)
                except Exception:
                    stale.append((user_id, socket))

        for user_id, socket in stale:
            await self.disconnect(session_id, user_id, socket)


live_collaboration_manager = LiveCollaborationManager()