from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.database import get_db, Session, EmailSchedule
from services.claude_agent import stream_chat
from services.scheduler import schedule_email_job
import uuid
import json

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    message: str
    coaching_mode: bool = False


@router.post("/session")
async def create_session(db: AsyncSession = Depends(get_db)):
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    session = Session(id=session_id)
    db.add(session)
    await db.commit()
    return {"session_id": session_id}


@router.get("/session/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "session_id": session_id,
        "profile": session.get_profile(),
        "messages": session.get_messages(),
        "coaching_mode": session.coaching_mode,
    }


@router.post("/send")
async def send_message(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Send a message and stream the AI response via SSE."""

    # Get or create session
    result = await db.execute(select(Session).where(Session.id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        session = Session(id=req.session_id)
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # Append user message
    messages = session.get_messages()
    messages.append({"role": "user", "content": req.message})
    session.set_messages(messages)
    await db.commit()

    profile = session.get_profile()
    resume_text = session.resume_text or ""
    coaching_mode = req.coaching_mode or session.coaching_mode

    # Tool callbacks
    async def update_profile(field: str, value: str):
        result2 = await db.execute(select(Session).where(Session.id == req.session_id))
        s = result2.scalar_one_or_none()
        if s:
            p = s.get_profile()
            p[field] = value
            s.set_profile(p)
            await db.commit()

    async def store_jobs(jobs: list):
        pass  # Could store to DB if needed

    async def schedule_email(email: str, search_params: dict):
        schedule_id = str(uuid.uuid4())
        sched = EmailSchedule(
            id=schedule_id,
            session_id=req.session_id,
            email=email,
            search_params=json.dumps(search_params),
        )
        db.add(sched)
        await db.commit()
        # Register with APScheduler
        r2 = await db.execute(select(Session).where(Session.id == req.session_id))
        s2 = r2.scalar_one_or_none()
        name = s2.get_profile().get("name", "there") if s2 else "there"
        schedule_email_job(schedule_id, email, search_params, name)

    async def set_coaching_mode(enabled: bool):
        result3 = await db.execute(select(Session).where(Session.id == req.session_id))
        s3 = result3.scalar_one_or_none()
        if s3:
            s3.coaching_mode = enabled
            await db.commit()

    tool_callbacks = {
        "update_profile": update_profile,
        "store_jobs": store_jobs,
        "schedule_email": schedule_email,
        "set_coaching_mode": set_coaching_mode,
    }

    full_response_parts = []

    async def generate():
        nonlocal full_response_parts
        async for chunk in stream_chat(
            session_id=req.session_id,
            messages=messages,
            candidate_profile=profile,
            resume_text=resume_text,
            coaching_mode=coaching_mode,
            tool_callbacks=tool_callbacks,
        ):
            if '"type": "text_chunk"' in chunk:
                try:
                    data = json.loads(chunk.replace("data: ", "").strip())
                    if data.get("type") == "text_chunk":
                        full_response_parts.append(data.get("text", ""))
                except Exception:
                    pass
            yield chunk

        # Save assistant message after stream completes
        full_text = "".join(full_response_parts)
        if full_text:
            result4 = await db.execute(select(Session).where(Session.id == req.session_id))
            s4 = result4.scalar_one_or_none()
            if s4:
                msgs = s4.get_messages()
                msgs.append({"role": "assistant", "content": full_text})
                s4.set_messages(msgs)
                await db.commit()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
