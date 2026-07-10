import asyncio
import json

from redis_client import redis_client
from websocket_manager import websocket_manager


CHANNEL = "ai-film-studio:events"


async def redis_event_listener():
    pubsub = redis_client.pubsub()

    pubsub.subscribe(CHANNEL)

    while True:
        message = pubsub.get_message(
            ignore_subscribe_messages=True,
            timeout=1,
        )

        if message:
            try:
                payload = json.loads(message["data"])

                await websocket_manager.send_batch_update(
                    payload["batch_id"],
                    payload,
                )

            except Exception as ex:
                print(f"Redis event error: {ex}")

        await asyncio.sleep(0.05)