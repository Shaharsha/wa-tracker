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


def reschedule(minutes: int):
    """Change the sync interval. Takes effect immediately."""
    scheduler.reschedule_job(
        "waha_poller",
        trigger="interval",
        minutes=minutes,
    )


def get_interval_minutes() -> int:
    job = scheduler.get_job("waha_poller")
    if job and job.trigger:
        return int(job.trigger.interval.total_seconds() / 60)
    return settings.poll_interval_minutes


def stop_scheduler():
    scheduler.shutdown(wait=False)
