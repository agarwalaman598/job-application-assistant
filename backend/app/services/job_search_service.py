import os
import re
from typing import Any

import httpx


JSEARCH_ENDPOINT = "https://jsearch.p.rapidapi.com/search"
ROLE_HINT_WORDS = {
    "engineer", "developer", "analyst", "manager", "architect", "consultant",
    "scientist", "specialist", "administrator", "designer", "lead", "intern",
    "associate", "principal", "officer", "technician",
}
GENERIC_QUERY_WORDS = {
    "in", "at", "for", "with", "and", "or", "to", "of", "remote", "hybrid", "onsite",
    "job", "jobs", "opening", "openings", "role", "roles",
}
FILENAME_STOP_WORDS = {
    "resume", "cv", "final", "latest", "updated", "version", "v1", "v2", "v3",
    "copy", "draft", "pdf", "aman", "my", "new",
}


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _tokenize_words(value: str) -> list[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z0-9+#\-.]{1,}", (value or "").lower())


def _extract_resume_role_terms(filename: str) -> set[str]:
    tokens = _tokenize_words(filename)
    role_terms = set()
    for token in tokens:
        if token in FILENAME_STOP_WORDS or len(token) < 3:
            continue
        if token in ROLE_HINT_WORDS:
            role_terms.add(token)
    return role_terms


def _normalize_resume_skills(tags: list[str]) -> set[str]:
    skills = set()
    for tag in tags or []:
        clean = _normalize_text(tag)
        if not clean:
            continue
        skills.add(clean)
    return skills


def _build_job_text(job: dict[str, Any]) -> str:
    title = job.get("job_title") or ""
    desc = job.get("job_description") or ""
    highlights = job.get("job_highlights") or {}
    highlight_parts: list[str] = []
    if isinstance(highlights, dict):
        for values in highlights.values():
            if isinstance(values, list):
                highlight_parts.extend(str(v) for v in values)
    return _normalize_text(" ".join([title, desc, " ".join(highlight_parts)]))


def _build_location(job: dict[str, Any]) -> str:
    city = (job.get("job_city") or "").strip()
    state = (job.get("job_state") or "").strip()
    country = (job.get("job_country") or "").strip()
    pieces = [p for p in [city, state, country] if p]
    if pieces:
        return ", ".join(pieces)
    return (job.get("job_location") or "Remote/Not specified").strip() or "Remote/Not specified"


def _build_apply_link(job: dict[str, Any]) -> str:
    # JSearch payloads can expose apply URLs under different keys.
    return (
        job.get("job_apply_link")
        or job.get("job_google_link")
        or job.get("job_publisher_url")
        or ""
    )


def _score_job_for_resumes(
    job: dict[str, Any],
    resumes: list[dict[str, Any]],
    query_role_terms: set[str],
) -> dict[str, Any] | None:
    job_text = _build_job_text(job)
    title_text = _normalize_text(job.get("job_title") or "")

    matched_skill_tags: set[str] = set()
    matched_resume_names: list[str] = []
    role_match_found = False

    for resume in resumes:
        resume_skills: set[str] = resume["skills"]
        role_terms: set[str] = resume["role_terms"]
        effective_role_terms = role_terms or query_role_terms

        resume_has_match = False

        for skill in resume_skills:
            if skill and skill in job_text:
                matched_skill_tags.add(skill)
                resume_has_match = True

        if effective_role_terms and any(term in title_text for term in effective_role_terms):
            role_match_found = True
            resume_has_match = True

        if resume_has_match:
            matched_resume_names.append(resume["name"])

    # Keep strictly non-relevant results out, but allow query-based role matches even
    # when a resume has no tags/role hints yet.
    if not matched_skill_tags and not role_match_found:
        return None

    score = (2 * len(matched_skill_tags)) + (3 if role_match_found else 0)
    if len(matched_resume_names) >= 2:
        score += 5

    job_id = str(job.get("job_id") or "")
    title = (job.get("job_title") or "Untitled role").strip()
    company = (job.get("employer_name") or "Unknown company").strip()
    location = _build_location(job)
    apply_link = _build_apply_link(job)
    posted_at = job.get("job_posted_at_datetime_utc") or job.get("job_posted_human_readable")

    # Skip entries without apply links so cards remain actionable.
    if not apply_link:
        return None

    return {
        "job_id": job_id or f"{company}-{title}",
        "title": title,
        "company": company,
        "location": location,
        "apply_link": apply_link,
        "score": score,
        "tags": sorted(matched_skill_tags),
        "matched_resumes": matched_resume_names,
        "posted_at": posted_at,
    }


async def search_jobs_for_resumes(
    query: str,
    location: str,
    date_posted: str,
    page: int,
    num_pages: int,
    resumes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    api_key = os.getenv("RAPIDAPI_KEY") or os.getenv("JSEARCH_API_KEY")
    if not api_key:
        raise RuntimeError("Missing JSearch API key. Set RAPIDAPI_KEY or JSEARCH_API_KEY.")

    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    q = query.strip()
    if location.strip():
        q = f"{q} in {location.strip()}"

    params = {
        "query": q,
        "page": page,
        "num_pages": num_pages,
        "date_posted": date_posted,
    }

    query_role_terms = {
        token
        for token in _tokenize_words(query)
        if token not in GENERIC_QUERY_WORDS and len(token) >= 3
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(JSEARCH_ENDPOINT, headers=headers, params=params)

    if response.status_code >= 400:
        raise RuntimeError(f"JSearch request failed with status {response.status_code}")

    payload = response.json() if response.content else {}
    rows = payload.get("data") or []
    if not isinstance(rows, list):
        rows = []

    enriched: list[dict[str, Any]] = []
    seen = set()

    for job in rows:
        if not isinstance(job, dict):
            continue
        scored = _score_job_for_resumes(job, resumes, query_role_terms)
        if not scored:
            continue
        dedupe_key = (scored["company"].lower(), scored["title"].lower(), scored["location"].lower())
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        enriched.append(scored)

    enriched.sort(key=lambda item: (item["score"], len(item["tags"])), reverse=True)
    return enriched


def build_resume_match_inputs(resume_rows: list[Any]) -> list[dict[str, Any]]:
    prepared: list[dict[str, Any]] = []
    for resume in resume_rows:
        name = (getattr(resume, "filename", "Resume") or "Resume").strip()
        prepared.append(
            {
                "id": getattr(resume, "id"),
                "name": name,
                "skills": _normalize_resume_skills(getattr(resume, "tags", []) or []),
                "role_terms": _extract_resume_role_terms(name),
            }
        )
    return prepared
