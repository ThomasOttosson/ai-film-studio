import asyncio
import json
import os
import time

from generation_queue import process_generation_batch
from redis_client import redis_client

QUEUE_LIST_KEY = "ai-film-studio:generation-jobs"
WORKER_SLEEP_SECONDS = float(os.getenv("WORKER_SLEEP_SECONDS", "1"))


async def run_job(batch_id: str) -> None:
    print(f"Worker started job: {batch_id}")

    try:
        await process_generation_batch(batch_id)
        print(f"Worker completed job: {batch_id}")
    except Exception as error:
        print(f"Worker failed job {batch_id}: {error}")


async def worker_loop() -> None:
    print("AI Film Studio worker started.")
    print(f"Listening on Redis queue: {QUEUE_LIST_KEY}")

    while True:
        job = redis_client.blpop(QUEUE_LIST_KEY, timeout=5)

        if not job:
            await asyncio.sleep(WORKER_SLEEP_SECONDS)
            continue

        _, raw_payload = job

        try:
            payload = json.loads(raw_payload)
            batch_id = payload["batch_id"]
        except Exception as error:
            print(f"Invalid job payload: {raw_payload}. Error: {error}")
            continue

        await run_job(batch_id)


if __name__ == "__main__":
    asyncio.run(worker_loop())