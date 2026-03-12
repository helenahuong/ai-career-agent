from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, Session
from services.resume_parser import parse_resume, get_raw_text
import uuid

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload/{session_id}")
async def upload_resume(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    allowed = (".pdf", ".docx", ".doc", ".txt")
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(400, "File must be PDF, DOCX, or TXT")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(400, "File too large (max 5MB)")

    # Parse resume
    profile = parse_resume(content, file.filename)
    raw_text = get_raw_text(content, file.filename)

    # Get or create session
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        session = Session(id=session_id)
        db.add(session)

    session.set_profile(profile)
    session.resume_text = raw_text[:10000]
    await db.commit()

    return {
        "success": True,
        "profile": profile,
        "session_id": session_id,
    }
