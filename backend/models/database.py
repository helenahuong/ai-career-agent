from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, DateTime, Boolean
from datetime import datetime, timezone
import json
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. Add your Supabase connection string to .env")

# Supabase requires SSL; asyncpg accepts it via connect_args
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {},
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    candidate_profile: Mapped[str] = mapped_column(Text, default="{}")  # JSON string
    messages: Mapped[str] = mapped_column(Text, default="[]")  # JSON string
    resume_text: Mapped[str] = mapped_column(Text, default="")
    coaching_mode: Mapped[bool] = mapped_column(Boolean, default=False)

    def get_profile(self) -> dict:
        return json.loads(self.candidate_profile or "{}")

    def set_profile(self, profile: dict):
        self.candidate_profile = json.dumps(profile)

    def get_messages(self) -> list:
        return json.loads(self.messages or "[]")

    def set_messages(self, messages: list):
        self.messages = json.dumps(messages)


class EmailSchedule(Base):
    __tablename__ = "email_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36))
    email: Mapped[str] = mapped_column(String(255))
    search_params: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    def get_search_params(self) -> dict:
        return json.loads(self.search_params or "{}")


class JobSent(Base):
    __tablename__ = "jobs_sent"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36))
    job_external_id: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(500))
    company: Mapped[str] = mapped_column(String(255))
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
