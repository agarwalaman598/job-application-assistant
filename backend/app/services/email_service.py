"""
Email Service — Resend-powered transactional email.
Uses sandbox sender onboarding@resend.dev for testing.
Replace RESEND_FROM_EMAIL with a verified domain address for production.
"""
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
FROM_NAME  = os.getenv("RESEND_FROM_NAME", "JobAssist AI")
FROM_FORMATTED = f"{FROM_NAME} <{FROM_EMAIL}>"
_default_base_url = "http://localhost:5173"
APP_BASE_URL = os.getenv("APP_BASE_URL", _default_base_url)
if APP_BASE_URL == _default_base_url and os.getenv("APP_ENV", "production") != "development":
    logger.warning(
        "[Email] APP_BASE_URL is still 'http://localhost:5173' in production! "
        "Verification and password-reset links will point to localhost. "
        "Set APP_BASE_URL=https://<your-vercel-domain> in Render environment variables."
    )

logger.info("[Email] Resend API key: %s", "SET" if RESEND_API_KEY else "NOT SET")
logger.info("[Email] From: %s", FROM_FORMATTED)

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
        logger.info(f"[Email] Sent '{subject}' to {to} | id={r.get('id', 'unknown')}")
        status = "sent"
        return True

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[Email] FAILED to send '{subject}' to {to}: {e}")
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
                logger.error(f"[Email] Failed to write EmailLog: {log_err}")


# ─── Email Templates ──────────────────────────────────────────────────────────

def _base_template(title: str, body_html: str, preheader: str = "") -> str:
    preheader_html = f'<span style="display:none;max-height:0;overflow:hidden;">{preheader}&nbsp;</span>' if preheader else ""
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
{preheader_html}

<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 16px;">
<tr>
<td align="center">

<table width="540" cellpadding="0" cellspacing="0" style="background:#0f0f11;border-radius:14px;border:1px solid #1f1f23;overflow:hidden;">

<!-- HEADER -->
<tr>
<td style="padding:22px 28px;background:#0a0a0a;border-bottom:1px solid #1f1f23;">
<table width="100%">
<tr>
<td>
<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6366f1;margin-right:8px;"></span>
<span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
JobAssist AI
</span>
</td>
</tr>
</table>
</td>
</tr>

<!-- MAIN CONTENT -->
<tr>
<td style="padding:34px 28px;">

<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff;">
{title}
</h2>

{body_html}

</td>
</tr>

<!-- FOOTER CARD -->
<tr>
<td style="padding:0 28px 28px 28px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #1f1f23;border-radius:10px;">
<tr>
<td style="padding:14px 16px;font-size:12px;color:#6b7280;line-height:1.6;">
If you didn't request this email, you can safely ignore it.
</td>
</tr>
</table>
</td>
</tr>

<!-- COPYRIGHT -->
<tr>
<td style="padding:0 28px 24px 28px;text-align:center;">
<p style="margin:0;font-size:11px;color:#4b5563;">
© {datetime.now().year} JobAssist AI
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
"""


def send_verification_email(to: str, token: str, db=None, user_id: int = None) -> bool:
    verify_url = f"{APP_BASE_URL}/verify-email?token={token}"

    body = f"""
<p style="color:#a1a1aa;font-size:0.9rem;line-height:1.6;margin:0 0 20px;">
Thanks for signing up! Click the button below to verify your email address and activate your account.
</p>

<a href="{verify_url}"
style="display:inline-block;background:#6366f1;color:#ffffff;font-weight:600;font-size:0.85rem;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
Verify Email Address
</a>

<p style="color:#6b7280;font-size:0.75rem;margin:20px 0 0;">
Or copy this URL: <a href="{verify_url}" style="color:#6366f1;">{verify_url}</a> <br>
This link expires in <strong style="color:#ffffff;">24 hours</strong>.<br>
</p>
"""

    plain = (
        f"Welcome to JobAssist AI!\n\n"
        f"Please verify your email address by visiting the link below:\n"
        f"{verify_url}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"If you didn't sign up, you can safely ignore this email.\n\n"
    )

    return _send_email(
        to=to,
        subject="Confirm your email address for JobAssist AI",
        html=_base_template(
            "Confirm your email address",
            body,
            preheader="Click to verify and activate your JobAssist AI account."
        ),
        text=plain,
        email_type="verification",
        db=db,
        user_id=user_id,
    )


def send_password_reset_email(to: str, token: str, db=None, user_id: int = None) -> bool:
    reset_url = f"{APP_BASE_URL}/reset-password?token={token}"

    body = f"""
<p style="color:#a1a1aa;font-size:0.9rem;line-height:1.6;margin:0 0 20px;">
We received a request to reset your password. Click the button below to set a new one.
</p>

<a href="{reset_url}"
style="display:inline-block;background:#6366f1;color:#ffffff;font-weight:600;font-size:0.85rem;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
Reset Password
</a>

<p style="color:#6b7280;font-size:0.75rem;margin:20px 0 0;">
Or copy this URL: <a href="{reset_url}" style="color:#6366f1;">{reset_url}</a> <br>
This link expires in <strong style="color:#ffffff;">1 hour</strong>.<br>
</p>
"""

    plain = (
        f"Password reset request for JobAssist AI\n\n"
        f"Click the link below to set a new password:\n"
        f"{reset_url}\n\n"
        f"This link expires in 1 hour.\n\n"
    )

    return _send_email(
        to=to,
        subject="Reset your JobAssist AI password",
        html=_base_template(
            "Password reset request",
            body,
            preheader="Reset your JobAssist AI password. Link expires in 1 hour."
        ),
        text=plain,
        email_type="password_reset",
        db=db,
        user_id=user_id,
    )