"""
Email Service — Resend-powered transactional email.
Uses sandbox sender onboarding@resend.dev for testing.
Replace RESEND_FROM_EMAIL with a verified domain address for production.
"""
import os
import pathlib
from datetime import datetime
from dotenv import load_dotenv

_env_path = pathlib.Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(_env_path)
load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
FROM_NAME  = os.getenv("RESEND_FROM_NAME", "JobAssist AI")
FROM_FORMATTED = f"{FROM_NAME} <{FROM_EMAIL}>"
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")

print(f"[Email] Resend API key: {'SET' if RESEND_API_KEY else 'NOT SET'}")
print(f"[Email] From: {FROM_FORMATTED}")

def _send_email(to: str, subject: str, html: str, text: str, email_type: str, db=None, user_id: int = None) -> bool:
    """
    Core send function via Resend SDK.
    Logs result to EmailLog table if db session provided.
    Returns True on success, False on failure.
    """
    from app.models import EmailLog

    status = "failed"
    error_msg = None

    try:
        if not RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY not configured")

        import resend
        resend.api_key = RESEND_API_KEY

        params: resend.Emails.SendParams = {
            "from": FROM_FORMATTED,
            "to": [to],
            "subject": subject,
            "html": html,
            "text": text,  # plain-text fallback — critical for spam scoring
            "headers": {
                "X-Entity-Ref-ID": email_type,  # helps some filters categorise
            },
        }
        r = resend.Emails.send(params)
        print(f"[Email] Sent '{subject}' to {to} | id={r.get('id', 'unknown')}")
        status = "sent"
        return True

    except Exception as e:
        error_msg = str(e)
        print(f"[Email] FAILED to send '{subject}' to {to}: {e}")
        return False

    finally:
        if db is not None:
            try:
                log = EmailLog(
                    user_id=user_id,
                    to_email=to,
                    subject=subject,
                    email_type=email_type,
                    status=status,
                    error_message=error_msg,
                    sent_at=datetime.utcnow(),
                )
                db.add(log)
                db.commit()
            except Exception as log_err:
                print(f"[Email] Failed to write EmailLog: {log_err}")


# ─── Email Templates ──────────────────────────────────────────────────────────

def _base_template(title: str, body_html: str, preheader: str = "") -> str:
    preheader_html = f'<span style="display:none;max-height:0;overflow:hidden;">{preheader}&nbsp;</span>' if preheader else ""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0e0e12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      {preheader_html}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e12;padding:40px 0;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#18181f;border-radius:12px;border:1px solid #2a2a32;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#1c1a2e,#18181f);padding:28px 36px;border-bottom:1px solid #2a2a32;">
              <span style="font-size:1.1rem;font-weight:700;color:#d4942e;letter-spacing:-0.02em;">Job Application Assistant</span>
            </td></tr>
            <tr><td style="padding:32px 36px;">
              <h2 style="margin:0 0 16px;font-size:1.2rem;font-weight:700;color:#ececed;letter-spacing:-0.02em;">{title}</h2>
              {body_html}
            </td></tr>
            <tr><td style="padding:16px 36px 28px;border-top:1px solid #2a2a32;">
              <p style="margin:0;font-size:0.75rem;color:#5a5a63;">
                If you didn't request this, please ignore this email.<br>
                &copy; {datetime.now().year} Job Application Assistant
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def send_verification_email(to: str, token: str, db=None, user_id: int = None) -> bool:
    verify_url = f"{APP_BASE_URL}/verify-email?token={token}"
    body = f"""
    <p style="color:#8b8b92;font-size:0.9rem;line-height:1.6;margin:0 0 20px;">
      Thanks for signing up! Click the button below to verify your email address and activate your account.
    </p>
    <a href="{verify_url}"
       style="display:inline-block;background:#d4942e;color:#fff;font-weight:600;font-size:0.85rem;
              padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
      Verify Email Address
    </a>
    <p style="color:#5a5a63;font-size:0.75rem;margin:20px 0 0;">
      This link expires in <strong style="color:#8b8b92;">24 hours</strong>.<br>
      Or copy this URL: <a href="{verify_url}" style="color:#d4942e;">{verify_url}</a>
    </p>
    <p style="color:#5a5a63;font-size:0.72rem;margin:14px 0 0;padding:10px 12px;background:#111117;border-radius:6px;border-left:3px solid #2a2a32;">
      Can't find this email? Check your <strong style="color:#8b8b92;">spam or junk folder</strong>.
    </p>
    """
    plain = (
        f"Welcome to JobAssist AI!\n\n"
        f"Please verify your email address by visiting the link below:\n"
        f"{verify_url}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"If you didn't sign up, you can safely ignore this email.\n\n"
        f"Can't find this email? Check your spam or junk folder."
    )
    return _send_email(
        to=to,
        subject="Confirm your email address for JobAssist AI",
        html=_base_template("Confirm your email address", body, preheader="Click to verify and activate your JobAssist AI account."),
        text=plain,
        email_type="verification",
        db=db,
        user_id=user_id,
    )


def send_password_reset_email(to: str, token: str, db=None, user_id: int = None) -> bool:
    reset_url = f"{APP_BASE_URL}/reset-password?token={token}"
    body = f"""
    <p style="color:#8b8b92;font-size:0.9rem;line-height:1.6;margin:0 0 20px;">
      We received a request to reset your password. Click the button below to set a new one.
    </p>
    <a href="{reset_url}"
       style="display:inline-block;background:#d4942e;color:#fff;font-weight:600;font-size:0.85rem;
              padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
      Reset Password
    </a>
    <p style="color:#5a5a63;font-size:0.75rem;margin:20px 0 0;">
      This link expires in <strong style="color:#8b8b92;">1 hour</strong>.<br>
      If you didn't request this, your account is safe — ignore this email.<br>
      Or copy this URL: <a href="{reset_url}" style="color:#d4942e;">{reset_url}</a>
    </p>
    <p style="color:#5a5a63;font-size:0.72rem;margin:14px 0 0;padding:10px 12px;background:#111117;border-radius:6px;border-left:3px solid #2a2a32;">
      Can't find this email? Check your <strong style="color:#8b8b92;">spam or junk folder</strong>.
    </p>
    """
    plain = (
        f"Password reset request for JobAssist AI\n\n"
        f"Click the link below to set a new password:\n"
        f"{reset_url}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you didn't request this, your account is safe — you can ignore this email.\n\n"
        f"Can't find this email? Check your spam or junk folder."
    )
    return _send_email(
        to=to,
        subject="Reset your JobAssist AI password",
        html=_base_template("Password reset request", body, preheader="Reset your JobAssist AI password. Link expires in 1 hour."),
        text=plain,
        email_type="password_reset",
        db=db,
        user_id=user_id,
    )
