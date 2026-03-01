"""
Utility helpers shared across the app.
"""
import re


def sanitize_text(value: str) -> str:
    """
    Strip HTML/script tags and null bytes from user text input.
    Defence-in-depth against stored XSS — React already escapes on render,
    but we sanitise server-side too so the DB never stores raw markup.
    """
    if not isinstance(value, str):
        return value
    # Remove null bytes (prevent PostgreSQL injection via null-byte tricks)
    value = value.replace('\x00', '')
    # Strip all HTML/XML tags  <script>, <img onerror=...>, etc.
    value = re.sub(r'<[^>]+>', '', value)
    # Collapse runs of whitespace that stripping tags may leave behind
    value = re.sub(r'[ \t]{2,}', ' ', value)
    return value.strip()
