import pdfplumber
import docx
import io
import json
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def extract_text_from_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs)


def parse_resume(file_bytes: bytes, filename: str) -> dict:
    """Extract text from resume file and use Claude to structure the profile."""
    if filename.lower().endswith(".pdf"):
        raw_text = extract_text_from_pdf(file_bytes)
    elif filename.lower().endswith((".docx", ".doc")):
        raw_text = extract_text_from_docx(file_bytes)
    else:
        raw_text = file_bytes.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        return {"error": "Could not extract text from resume"}

    # Use Claude to structure the resume
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Extract structured information from this resume. Return ONLY valid JSON, no markdown.

Resume text:
{raw_text[:8000]}

Return JSON with these fields:
{{
  "name": "Full name",
  "current_title": "Current or most recent job title",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{"title": "Job Title", "company": "Company", "duration": "2022-2024", "highlights": ["key achievement"]}}
  ],
  "education": [
    {{"degree": "Degree", "school": "School", "year": "Year"}}
  ],
  "target_roles": ["role1", "role2"],
  "languages": ["English"]
}}"""
        }]
    )

    try:
        text = response.content[0].text.strip()
        # Strip markdown code blocks if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return {
            "name": "Unknown",
            "current_title": "Professional",
            "summary": "Experienced professional with diverse background.",
            "skills": [],
            "experience": [],
            "education": [],
            "target_roles": [],
            "raw_text": raw_text[:500]
        }


def get_raw_text(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif filename.lower().endswith((".docx", ".doc")):
        return extract_text_from_docx(file_bytes)
    return file_bytes.decode("utf-8", errors="ignore")
