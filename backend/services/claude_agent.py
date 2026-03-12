import json
import asyncio
import anthropic
import os
from dotenv import load_dotenv
from .job_searcher import search_jobs

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are Aria, a warm and expert AI career agent. You help people find their next role by searching for matching jobs, building their candidate profile, and coaching them through interviews.

## Your personality
- Warm, direct, and professional — like a brilliant recruiter friend
- You remember everything the user tells you and reference it naturally
- You celebrate wins and are encouraging during tough moments

## How you work
You have access to tools. Use them proactively:
- When the user shares preferences, ALWAYS call `update_candidate_profile` to save them
- When the user wants jobs, call `search_jobs` and then present results
- When the user provides an email, call `schedule_daily_email`
- In coaching mode, ask ONE interview question at a time, wait for the answer, then give specific feedback

## Response format
Your responses are a mix of text and special JSON blocks that the UI renders. Use these blocks:

For tool status (shown as green chips):
<tool_use>{"name": "update_candidate_profile", "label": "Update candidate profile"}</tool_use>

For job results (after searching):
<job_cards>{"jobs": [{"id":"...", "title":"...", "company":"...", "location":"...", "salary":"...", "url":"...", "remote":false, "fit_reason":"Why this matches the candidate", "watch_out":"One thing to clarify"}]}</job_cards>

For candidate profile display:
<profile_card>{"name":"...", "current_title":"...", "summary":"...", "skills":[], "experience":[]}</profile_card>

For structured choice questions:
<choice_options>{"type":"radio", "options":["Option 1", "Option 2", "Option 3"], "allow_text": true}</choice_options>

For grid choices (4-9 items):
<choice_options>{"type":"grid", "options":["Option 1", "Option 2", "Option 3", "Option 4"], "allow_text": true}</choice_options>

For progress indicator:
<progress_card>{"label": "Searching for jobs...", "complete": false}</progress_card>
<progress_card>{"label": "Search complete", "complete": true, "found": 5}</progress_card>

## Onboarding flow (if no profile yet)
1. Warmly greet the user based on what they said on the landing page
2. Ask them to upload their resume (or describe their background if no resume)
3. After resume upload/description: show a profile_card and ask about locations
4. Ask about work setup: Remote / Hybrid / Onsite
5. Ask about salary expectations
6. Ask for email for daily digest
7. Run first job search and show results

## Important rules
- Always use choice_options when asking multiple-choice questions
- Keep text responses concise — let the cards do the heavy lifting
- In coaching mode: ask one question, give feedback, then ask the next
- Never make up job listings — always call search_jobs tool first"""

TOOLS = [
    {
        "name": "update_candidate_profile",
        "description": "Save or update information about the candidate in their profile. Call this whenever you learn something new about the candidate.",
        "input_schema": {
            "type": "object",
            "properties": {
                "field": {
                    "type": "string",
                    "description": "The profile field to update (e.g. 'name', 'location', 'work_setup', 'salary_min', 'email', 'target_role', 'skills')"
                },
                "value": {
                    "type": "string",
                    "description": "The value to set"
                }
            },
            "required": ["field", "value"]
        }
    },
    {
        "name": "search_jobs",
        "description": "Search for job listings matching the candidate's profile. Always call this before showing job results.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Job title or keywords (e.g. 'Product Manager', 'AI Engineer')"},
                "location": {"type": "string", "description": "Location (e.g. 'London', 'Singapore', 'Remote')"},
                "remote": {"type": "boolean", "description": "Whether to search for remote jobs"},
                "salary_min": {"type": "integer", "description": "Minimum salary in local currency"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "schedule_daily_email",
        "description": "Set up daily job digest emails for the candidate. Call this when the user provides their email address.",
        "input_schema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": "Candidate's email address"},
                "search_params": {
                    "type": "object",
                    "description": "Search parameters for daily job search",
                    "properties": {
                        "query": {"type": "string"},
                        "location": {"type": "string"},
                        "remote": {"type": "boolean"}
                    }
                }
            },
            "required": ["email"]
        }
    },
    {
        "name": "start_interview_coaching",
        "description": "Switch to interview coaching mode for a specific job. Call this when the user wants to practice for an interview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "job_title": {"type": "string", "description": "The job title to practice for"},
                "job_description": {"type": "string", "description": "The job description or key requirements"}
            },
            "required": ["job_title"]
        }
    }
]


async def stream_chat(
    session_id: str,
    messages: list[dict],
    candidate_profile: dict,
    resume_text: str,
    coaching_mode: bool,
    tool_callbacks: dict,
):
    """
    Stream a chat response from Claude, yielding SSE-formatted events.
    tool_callbacks is a dict with async functions: update_profile, do_job_search, do_schedule_email
    """
    system = SYSTEM_PROMPT
    if candidate_profile:
        system += f"\n\n## Current candidate profile\n{json.dumps(candidate_profile, indent=2)}"
    if resume_text:
        system += f"\n\n## Resume text (reference for personalization)\n{resume_text[:3000]}"
    if coaching_mode:
        system += "\n\n## COACHING MODE ACTIVE\nYou are now in interview coaching mode. Ask interview questions one at a time."

    # Convert messages to Anthropic format
    anthropic_messages = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")
        if role in ("user", "assistant"):
            anthropic_messages.append({"role": role, "content": content})

    full_response_text = ""
    tool_uses = []

    # Initial streaming pass
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=system,
        tools=TOOLS,
        messages=anthropic_messages,
    ) as stream:
        for event in stream:
            if hasattr(event, "type"):
                if event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        chunk = event.delta.text
                        full_response_text += chunk
                        yield f"data: {json.dumps({'type': 'text_chunk', 'text': chunk})}\n\n"
                elif event.type == "content_block_start":
                    if hasattr(event.content_block, "type") and event.content_block.type == "tool_use":
                        tool_uses.append({
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "input": {}
                        })
                elif event.type == "content_block_stop":
                    pass

        final_message = stream.get_final_message()

    # Handle tool calls
    if final_message.stop_reason == "tool_use":
        # Extract tool use blocks
        tool_results = []
        for block in final_message.content:
            if block.type == "tool_use":
                tool_name = block.name
                tool_input = block.input

                # Emit tool status chip
                label = _tool_label(tool_name)
                yield f"data: {json.dumps({'type': 'tool_use', 'name': tool_name, 'label': label})}\n\n"
                await asyncio.sleep(0.1)

                # Execute the tool
                result = await _execute_tool(tool_name, tool_input, tool_callbacks)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result)
                })

                # If job search, emit job cards immediately
                if tool_name == "search_jobs" and result.get("jobs"):
                    yield f"data: {json.dumps({'type': 'progress_card', 'label': 'Search complete', 'complete': True, 'found': len(result['jobs'])})}\n\n"

        # Continue conversation with tool results
        new_messages = anthropic_messages + [
            {"role": "assistant", "content": final_message.content},
            {"role": "user", "content": tool_results}
        ]

        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=system,
            tools=TOOLS,
            messages=new_messages,
        ) as stream2:
            for event in stream2:
                if hasattr(event, "type") and event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        chunk = event.delta.text
                        full_response_text += chunk
                        yield f"data: {json.dumps({'type': 'text_chunk', 'text': chunk})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _execute_tool(tool_name: str, tool_input: dict, callbacks: dict) -> dict:
    if tool_name == "update_candidate_profile":
        if "update_profile" in callbacks:
            await callbacks["update_profile"](tool_input.get("field"), tool_input.get("value"))
        return {"success": True, "field": tool_input.get("field"), "value": tool_input.get("value")}

    elif tool_name == "search_jobs":
        jobs = await search_jobs(
            query=tool_input.get("query", ""),
            location=tool_input.get("location", ""),
            remote=tool_input.get("remote", False),
            salary_min=tool_input.get("salary_min", 0),
        )
        if "store_jobs" in callbacks:
            await callbacks["store_jobs"](jobs)
        return {"jobs": jobs}

    elif tool_name == "schedule_daily_email":
        if "schedule_email" in callbacks:
            await callbacks["schedule_email"](
                tool_input.get("email", ""),
                tool_input.get("search_params", {})
            )
        return {"success": True, "email": tool_input.get("email"), "message": "Daily digest scheduled"}

    elif tool_name == "start_interview_coaching":
        if "set_coaching_mode" in callbacks:
            await callbacks["set_coaching_mode"](True)
        return {
            "success": True,
            "job_title": tool_input.get("job_title"),
            "message": "Switched to interview coaching mode"
        }

    return {"error": f"Unknown tool: {tool_name}"}


def _tool_label(tool_name: str) -> str:
    labels = {
        "update_candidate_profile": "Update candidate profile",
        "search_jobs": "Searching jobs...",
        "schedule_daily_email": "Schedule daily digest",
        "start_interview_coaching": "Start coaching mode",
    }
    return labels.get(tool_name, tool_name)
