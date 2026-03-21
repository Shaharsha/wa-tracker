from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.services.sync_service import poll_and_update

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.add_job(
        poll_and_update,
        "interval",
        minutes=settings.poll_interval_minutes,
        id="waha_poller",
        next_run_time=datetime.now(),
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown(wait=False)
