from fastapi import APIRouter, Query
from services.job_searcher import search_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/search")
async def search(
    q: str = Query(..., description="Job title or keywords"),
    location: str = Query("", description="Location"),
    remote: bool = Query(False),
    salary_min: int = Query(0),
    results: int = Query(8, le=20),
):
    jobs = await search_jobs(
        query=q,
        location=location,
        remote=remote,
        salary_min=salary_min,
        results=results,
    )
    return {"jobs": jobs, "count": len(jobs)}
