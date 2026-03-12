import httpx
import os
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
JSEARCH_BASE = "https://jsearch.p.rapidapi.com/search"
JSEARCH_HEADERS = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
}


async def search_jobs(
    query: str,
    location: str = "",
    remote: bool = False,
    salary_min: int = 0,
    results: int = 8,
) -> list[dict]:
    """Search jobs via JSearch API (LinkedIn + Indeed aggregator). Returns list of job dicts."""
    if not RAPIDAPI_KEY:
        return _mock_jobs(query, location)

    # Build search query — JSearch accepts natural language queries
    search_query = query
    if location and not remote:
        search_query = f"{query} in {location}"
    if remote:
        search_query = f"{query} remote"

    params = {
        "query": search_query,
        "page": "1",
        "num_pages": "1",
        "date_posted": "month",
    }
    if remote:
        params["remote_jobs_only"] = "true"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(JSEARCH_BASE, params=params, headers=JSEARCH_HEADERS)
            resp.raise_for_status()
            data = resp.json()

            jobs = []
            for item in (data.get("data") or [])[:results]:
                salary = _format_salary(
                    item.get("job_min_salary"),
                    item.get("job_max_salary"),
                    item.get("job_salary_currency", "USD"),
                    item.get("job_salary_period", "YEAR"),
                )
                jobs.append({
                    "id": item.get("job_id", ""),
                    "title": item.get("job_title", ""),
                    "company": item.get("employer_name", "Unknown"),
                    "location": _format_location(item),
                    "salary": salary,
                    "description": (item.get("job_description") or "")[:400],
                    "url": item.get("job_apply_link") or item.get("job_url", ""),
                    "posted": item.get("job_posted_at_datetime_utc", ""),
                    "source": item.get("job_publisher", ""),  # "LinkedIn", "Indeed", etc.
                    "remote": item.get("job_is_remote", remote),
                    "logo": item.get("employer_logo", ""),
                })
            return jobs
        except Exception as e:
            print(f"JSearch API error: {e}")
            return _mock_jobs(query, location)


def _format_location(item: dict) -> str:
    city = item.get("job_city", "")
    state = item.get("job_state", "")
    country = item.get("job_country", "")
    parts = [p for p in [city, state, country] if p]
    return ", ".join(parts) if parts else "Location not listed"


def _format_salary(salary_min, salary_max, currency: str, period: str) -> str:
    if not salary_min and not salary_max:
        return "Salary not listed"

    symbols = {"USD": "$", "GBP": "£", "EUR": "€", "SGD": "SGD ", "AUD": "AUD ", "CAD": "CAD "}
    sym = symbols.get(currency, f"{currency} ")
    suffix = {"YEAR": "/year", "MONTH": "/month", "HOUR": "/hour"}.get(period, "")

    if salary_min and salary_max:
        return f"est. {sym}{int(salary_min):,} – {sym}{int(salary_max):,}{suffix}"
    if salary_min:
        return f"est. {sym}{int(salary_min):,}+{suffix}"
    return f"up to {sym}{int(salary_max):,}{suffix}"


def _mock_jobs(query: str, location: str) -> list[dict]:
    """Return mock jobs when API key is not set (for local development)."""
    return [
        {
            "id": "mock-1",
            "title": f"Senior {query}",
            "company": "TechCorp Inc.",
            "location": location or "Remote",
            "salary": "est. $120,000 – $150,000/year",
            "description": f"We are looking for a talented {query} to join our growing team. You will work on cutting-edge AI products and collaborate with a world-class engineering team.",
            "url": "https://example.com/job/1",
            "posted": "2024-01-15",
            "source": "LinkedIn",
            "remote": True,
            "logo": "",
        },
        {
            "id": "mock-2",
            "title": f"{query} Manager",
            "company": "StartupAI",
            "location": location or "San Francisco, CA",
            "salary": "est. $130,000 – $170,000/year",
            "description": f"Join our fast-growing AI startup as a {query} Manager. You'll shape the product roadmap and work directly with founders.",
            "url": "https://example.com/job/2",
            "posted": "2024-01-14",
            "source": "Indeed",
            "remote": False,
            "logo": "",
        },
        {
            "id": "mock-3",
            "title": f"{query} Lead",
            "company": "GlobalTech",
            "location": location or "New York, NY",
            "salary": "est. $110,000 – $140,000/year",
            "description": f"Lead a team of engineers building next-gen {query} solutions. Strong background in AI/ML required.",
            "url": "https://example.com/job/3",
            "posted": "2024-01-13",
            "source": "LinkedIn",
            "remote": True,
            "logo": "",
        },
    ]
