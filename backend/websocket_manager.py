from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, batch_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[batch_id].append(websocket)

    def disconnect(self, batch_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(batch_id, [])

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self.active_connections.pop(batch_id, None)

    async def send_batch_update(
        self,
        batch_id: str,
        payload: dict,
    ) -> None:
        connections = list(self.active_connections.get(batch_id, []))

        disconnected_connections: list[WebSocket] = []

        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                disconnected_connections.append(websocket)

        for websocket in disconnected_connections:
            self.disconnect(batch_id, websocket)


websocket_manager = ConnectionManager()