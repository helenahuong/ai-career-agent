from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from .job_searcher import search_jobs
from .email_service import send_daily_digest

scheduler = AsyncIOScheduler()


async def run_daily_digest(email: str, search_params: dict, candidate_name: str = "there"):
    """Run job search and send digest email."""
    query = search_params.get("query", "Software Engineer")
    location = search_params.get("location", "")
    remote = search_params.get("remote", False)

    jobs = await search_jobs(query=query, location=location, remote=remote, results=5)
    if jobs:
        send_daily_digest(email=email, jobs=jobs, candidate_name=candidate_name)
        print(f"[Scheduler] Sent digest to {email} with {len(jobs)} jobs")


def schedule_email_job(schedule_id: str, email: str, search_params: dict, candidate_name: str = "there"):
    """Add a daily cron job for a user's email digest."""
    job_id = f"digest_{schedule_id}"
    # Remove existing job if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    scheduler.add_job(
        run_daily_digest,
        CronTrigger(hour=8, minute=0),  # 8am daily
        id=job_id,
        args=[email, search_params, candidate_name],
        replace_existing=True,
    )
    print(f"[Scheduler] Scheduled daily digest for {email} at 8am")


def remove_email_job(schedule_id: str):
    job_id = f"digest_{schedule_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("[Scheduler] Started")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
