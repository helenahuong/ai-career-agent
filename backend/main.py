from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.database import init_db
from routers import chat, resume, jobs
from services.scheduler import start_scheduler, shutdown_scheduler
import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Aria Career Agent API",
    description="AI-powered career agent: job search, resume parsing, interview coaching",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(resume.router)
app.include_router(jobs.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Aria Career Agent"}
