import resend
import os
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = "Aria Career Agent <aria@resend.dev>"


def build_job_card_html(job: dict, fit_reason: str = "") -> str:
    remote_badge = '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:6px;">Remote</span>' if job.get("remote") else ""
    return f"""
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:16px 0;background:#fff;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:40px;height:40px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#6b7280;">
          {job.get('company', 'Co')[:2].upper()}
        </div>
        <div>
          <a href="{job.get('url', '#')}" style="font-size:16px;font-weight:600;color:#111827;text-decoration:none;">{job.get('title', '')}</a>
          <div style="font-size:13px;color:#6b7280;">{job.get('company', '')} · {job.get('location', '')}</div>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        {remote_badge}
        <span style="background:#f0fdf4;color:#15803d;padding:2px 8px;border-radius:12px;font-size:12px;">{job.get('salary', '')}</span>
      </div>
      {f'<div style="margin:12px 0;padding:10px;background:#f9fafb;border-radius:8px;font-size:13px;color:#374151;border-left:3px solid #10b981;"><strong>Why this is a fit:</strong> {fit_reason}</div>' if fit_reason else ""}
      <p style="font-size:13px;color:#6b7280;margin:8px 0;">{job.get('description', '')[:200]}...</p>
      <a href="{job.get('url', '#')}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;">View Job →</a>
    </div>
    """


def send_daily_digest(email: str, jobs: list[dict], candidate_name: str = "there") -> bool:
    """Send daily job digest email via Resend."""
    if not resend.api_key:
        print(f"[Email] Would send digest to {email} with {len(jobs)} jobs (no API key)")
        return True

    jobs_html = "".join(build_job_card_html(j, j.get("fit_reason", "")) for j in jobs[:5])

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <div style="background:#111827;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">Your daily job digest</h1>
          <p style="color:#9ca3af;margin:4px 0 0;font-size:13px;">Hi {candidate_name}, here are today's top matches from Aria</p>
        </div>
        <div style="padding:24px 32px;">
          <p style="color:#374151;font-size:14px;margin-top:0;">Found <strong>{len(jobs)} new matches</strong> based on your profile today.</p>
          {jobs_html}
          <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">Powered by Aria Career Agent · <a href="#" style="color:#9ca3af;">Unsubscribe</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [email],
            "subject": f"Your daily job digest — {len(jobs)} new matches",
            "html": html,
        })
        return True
    except Exception as e:
        print(f"[Email] Error sending to {email}: {e}")
        return False
