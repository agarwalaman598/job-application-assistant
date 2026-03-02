"""
Autofill Service — Form detection via HTTP + HTML parsing (no browser needed).
Form filling generates a pre-filled URL instead of using Playwright.
"""
import logging
import re
import json
from typing import Dict
from urllib.parse import urlencode
import httpx

logger = logging.getLogger(__name__)


def _detect_platform(url: str) -> str:
    """Detect which form platform a URL belongs to."""
    url_lower = url.lower()
    if "docs.google.com/forms" in url_lower:
        return "google_forms"
    elif "forms.office.com" in url_lower or "forms.microsoft.com" in url_lower:
        return "microsoft_forms"
    elif "typeform.com" in url_lower:
        return "typeform"
    elif "jotform.com" in url_lower:
        return "jotform"
    return "generic"


async def detect_fields(url: str) -> dict:
    """Detect form fields by fetching HTML and parsing — no browser needed."""

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        html = resp.text
        final_url = str(resp.url)  # httpx URL object → string
    except Exception as e:
        raise Exception(f"Failed to fetch form: {str(e)}")

    platform = _detect_platform(final_url)
    logger.info(f"[Autofill] Final URL: {final_url}")
    logger.info(f"[Autofill] Platform: {platform}")

    fields = []
    form_url = final_url  # Store the actual form URL

    if platform == "google_forms":
        fields = _parse_google_forms(html)
        # Extract the base form URL for pre-fill
        base_match = re.match(r'(https://docs\.google\.com/forms/d/e/[^/]+)', final_url)
        if base_match:
            form_url = base_match.group(1) + "/viewform"
    elif platform == "microsoft_forms":
        fields = _parse_ms_forms(html)
    else:
        fields = _parse_generic_form(html)

    logger.info(f"[Autofill] Detected {len(fields)} fields")
    return {"platform": platform, "fields": fields, "form_url": form_url}


def _parse_google_forms(html: str) -> list:
    """
    Parse Google Form fields from HTML.
    Google Forms embed form data in FB_PUBLIC_LOAD_DATA_.

    Structure per item:
      item[0] = field ID number
      item[1] = label string
      item[2] = description (usually null)
      item[3] = type code (0=short, 1=paragraph, 2=radio, 3=dropdown, 4=checkbox, 5=scale, 8=section header, 9=date, 10=time)
                None or 8 = section header / page break (skip these)
      item[4] = array of field entries: [[entry_id, [[opt1], [opt2], ...], ...]]
    """
    fields = []

    fb_match = re.search(r'FB_PUBLIC_LOAD_DATA_\s*=\s*(.*?);', html, re.DOTALL)
    if fb_match:
        try:
            data = json.loads(fb_match.group(1))
            if len(data) > 1 and data[1] and len(data[1]) > 1:
                form_items = data[1][1]
                for i, item in enumerate(form_items):
                    if not item or not isinstance(item, list) or len(item) < 2:
                        continue

                    label = str(item[1]) if item[1] else None
                    if not label:
                        continue

                    # item[3] is the type code directly
                    q_type = item[3] if len(item) > 3 else None
                    if q_type is None or q_type == 8:
                        # Section header / page break, skip
                        continue

                    # Also skip items with no actual entry data (no input field)
                    has_entries = len(item) > 4 and item[4] and isinstance(item[4], list) and len(item[4]) > 0
                    if not has_entries:
                        continue

                    type_map = {
                        0: "text", 1: "textarea", 2: "radio",
                        3: "dropdown", 4: "checkbox", 5: "radio",
                        7: "grid", 9: "date", 10: "time",
                    }
                    field_type = type_map.get(q_type, "text")

                    # Extract entry ID from item[4][0][0] — used for pre-filled URLs
                    entry_id = None
                    if isinstance(item[4][0], list) and len(item[4][0]) > 0:
                        entry_id = item[4][0][0]

                    # Extract options from item[4][0][1]
                    options = []
                    for entry in item[4]:
                        if isinstance(entry, list) and len(entry) > 1 and isinstance(entry[1], list):
                            for opt in entry[1]:
                                if isinstance(opt, list) and len(opt) > 0:
                                    options.append(str(opt[0]))

                    # Check required flag
                    required = False
                    for entry in item[4]:
                        if isinstance(entry, list) and len(entry) > 2:
                            required = bool(entry[2]) if entry[2] is not None else False

                    fields.append({
                        "field_id": f"entry.{entry_id}" if entry_id else f"field_{i}",
                        "label": label,
                        "field_type": field_type,
                        "required": required,
                        "options": options,
                    })

                if fields:
                    return fields
        except (json.JSONDecodeError, IndexError, TypeError) as e:
            logger.warning(f"[Autofill] FB_PUBLIC_LOAD_DATA_ parse failed: {e}")

    # Fallback: parse from HTML class names
    label_matches = re.findall(r'class="[^"]*M7eMe[^"]*"[^>]*>([^<]+)<', html)
    for i, label in enumerate(label_matches):
        label = label.strip()
        if label:
            fields.append({
                "field_id": f"field_{i}",
                "label": label,
                "field_type": "text",
                "required": False,
                "options": [],
            })

    return fields


def _parse_ms_forms(html: str) -> list:
    """Parse Microsoft Forms fields from HTML."""
    fields = []

    data_match = re.search(r'__FORM_DATA__\s*=\s*({[\s\S]*?});\s*</', html)
    if not data_match:
        data_match = re.search(r'"questions"\s*:\s*(\[[\s\S]*?\])', html)

    if data_match:
        try:
            data = json.loads(data_match.group(1))
            questions = data if isinstance(data, list) else data.get("questions", [])
            for i, q in enumerate(questions):
                fields.append({
                    "field_id": f"field_{i}",
                    "label": q.get("title", q.get("questionText", f"Question {i+1}")),
                    "field_type": q.get("type", "text"),
                    "required": q.get("required", False),
                    "options": [o.get("text", "") for o in q.get("choices", [])],
                })
        except (json.JSONDecodeError, TypeError):
            pass

    if not fields:
        labels = re.findall(r'question-title[^>]*>([^<]+)<', html)
        for i, label in enumerate(labels):
            fields.append({
                "field_id": f"field_{i}",
                "label": label.strip(),
                "field_type": "text",
                "required": False,
                "options": [],
            })

    return fields


def _parse_generic_form(html: str) -> list:
    """Parse generic HTML form fields."""
    fields = []

    input_matches = re.findall(
        r'<(input|textarea|select)\s+([^>]*?)(?:/>|>)',
        html, re.IGNORECASE
    )

    for i, (tag, attrs) in enumerate(input_matches):
        inp_type = re.search(r'type=["\']([^"\']+)', attrs)
        inp_type = inp_type.group(1) if inp_type else "text"

        if inp_type in ("hidden", "submit", "button"):
            continue

        name = re.search(r'name=["\']([^"\']+)', attrs)
        name = name.group(1) if name else f"field_{i}"

        placeholder = re.search(r'placeholder=["\']([^"\']+)', attrs)
        label = placeholder.group(1) if placeholder else name

        field_type = "text"
        if tag.lower() == "textarea":
            field_type = "textarea"
        elif tag.lower() == "select":
            field_type = "dropdown"
        elif inp_type == "email":
            field_type = "email"
        elif inp_type == "file":
            field_type = "file"

        fields.append({
            "field_id": name,
            "label": label,
            "field_type": field_type,
            "required": "required" in attrs.lower(),
            "options": [],
        })

    return fields


# ═══════════════════════════════════════
#  FORM FILLING — Pre-filled URL generation
# ═══════════════════════════════════════

async def fill_form(form_url: str, field_map: Dict[str, str]) -> dict:
    """
    Generate a pre-filled Google Form URL.
    Google Forms support: ?entry.XXXXX=value&entry.YYYYY=value
    """
    try:
        params = {}
        filled = 0
        for field_id, value in field_map.items():
            if not value or not value.strip():
                continue
            # field_id is already in "entry.XXXXX" format from the parser
            if field_id.startswith("entry."):
                params[field_id] = value
                filled += 1
            else:
                # Non-Google Forms — can't pre-fill via URL
                filled += 1

        if not params:
            return {
                "success": False,
                "filled_count": 0,
                "errors": ["No fields to fill"],
                "prefilled_url": None,
            }

        # Build the pre-filled URL
        prefilled_url = form_url + "?" + urlencode(params)

        return {
            "success": True,
            "filled_count": filled,
            "errors": [],
            "prefilled_url": prefilled_url,
        }

    except Exception as e:
        return {
            "success": False,
            "filled_count": 0,
            "errors": [str(e)],
            "prefilled_url": None,
        }
