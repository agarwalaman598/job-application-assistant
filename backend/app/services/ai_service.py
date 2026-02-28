"""
AI Service — All features powered by LLM API (Groq, OpenAI, Ollama, etc.)
Falls back to basic local methods only if LLM_API_KEY is not configured.
"""
import os
import json
import re
from typing import List, Tuple
from dotenv import load_dotenv
import pathlib

# Load .env from project root (4 levels up from backend/app/services/ai_service.py)
_env_path = pathlib.Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(_env_path)
load_dotenv()

# Debug: confirm key is loaded
_key = os.getenv("LLM_API_KEY", "")
print(f"[AI Service] LLM_API_KEY loaded: {'YES (' + _key[:8] + '...)' if _key else 'NO — using fallback'}")
print(f"[AI Service] LLM_API_URL: {os.getenv('LLM_API_URL', 'not set')}")
print(f"[AI Service] LLM_MODEL: {os.getenv('LLM_MODEL', 'not set')}")


def _get_llm_client():
    """Get an OpenAI-compatible client. Returns (client, model) or raises."""
    api_key = os.getenv("LLM_API_KEY", "")
    api_url = os.getenv("LLM_API_URL", "https://api.openai.com/v1")
    model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

    if not api_key:
        return None, model

    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=api_url)
    return client, model


def _llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 800, temperature: float = 0.3) -> str:
    """Make an LLM API call. Returns the response text or raises."""
    client, model = _get_llm_client()
    if client is None:
        raise ValueError("LLM_API_KEY not configured")

    print(f"[AI Service] Making LLM call to model: {model}")
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        result = response.choices[0].message.content.strip()
        print(f"[AI Service] LLM call succeeded, response length: {len(result)}")
        return result
    except Exception as e:
        print(f"[AI Service] *** LLM CALL FAILED: {type(e).__name__}: {e}")
        raise


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Strip markdown code fences
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (fences)
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Try to find JSON object in the text
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find first { ... } block
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group())
        raise


# ═══════════════════════════════════════════════
#  SKILL MATCHING — LLM-powered
# ═══════════════════════════════════════════════

def compute_match_score(user_skills: List[str], user_summary: str, jd_text: str, resume_text: str = "") -> Tuple[float, List[str], List[str]]:
    """
    Use LLM to intelligently compare user skills against a job description.
    Uses resume text for deeper analysis if available.
    Returns (score, matched_skills, missing_skills).
    """
    try:
        system_prompt = (
            "You are a job matching analysis engine. Given a candidate's skills, resume, and a job description, "
            "determine which of the candidate's skills match the JD requirements and which JD-required skills "
            "the candidate is missing.\n\n"
            "Return ONLY valid JSON with exactly these keys:\n"
            '- "match_score": integer 0-100 representing overall fit\n'
            '- "matched_skills": array of the candidate\'s skills that are relevant to this JD\n'
            '- "missing_skills": array of skills the JD requires that the candidate does NOT have\n'
            '- "reasoning": one sentence explaining the score\n\n'
            "Be thorough: consider aliases (e.g. JS = JavaScript, React.js = React), "
            "related skills, and experience level. Analyze the resume content deeply — "
            "look for skills mentioned in projects, work experience, certifications, etc. "
            "Be accurate — do not list a skill as matched "
            "if the candidate doesn't have it or something very close to it."
        )

        resume_section = f"\n\nCANDIDATE RESUME:\n{resume_text}" if resume_text else ""

        user_prompt = (
            f"CANDIDATE SKILLS: {', '.join(user_skills)}\n\n"
            f"CANDIDATE SUMMARY: {user_summary}{resume_section}\n\n"
            f"JOB DESCRIPTION:\n{jd_text}"
        )

        raw = _llm_call(system_prompt, user_prompt, max_tokens=600)
        result = _extract_json(raw)

        score = min(max(int(result.get("match_score", 50)), 0), 100)
        matched = result.get("matched_skills", [])
        missing = result.get("missing_skills", [])

        return float(score), matched, missing

    except Exception as e:
        print(f"[AI] LLM skill match failed, using fallback: {e}")
        return _fallback_match(user_skills, user_summary, jd_text)


def _fallback_match(user_skills: List[str], user_summary: str, jd_text: str) -> Tuple[float, List[str], List[str]]:
    """Basic keyword fallback if LLM is unavailable."""
    jd_lower = jd_text.lower()
    user_lower = [s.lower().strip() for s in user_skills]

    KNOWN_SKILLS = [
        "python", "javascript", "typescript", "react", "angular", "vue", "node.js",
        "java", "c++", "c#", ".net", "go", "rust", "ruby", "php", "swift", "kotlin",
        "sql", "mysql", "mongodb", "postgresql", "redis", "elasticsearch",
        "aws", "azure", "gcp", "docker", "kubernetes", "git", "ci/cd",
        "machine learning", "deep learning", "nlp", "data science",
        "tensorflow", "pytorch", "pandas", "numpy",
        "html", "css", "tailwind", "bootstrap",
        "flask", "django", "fastapi", "spring", "express",
        "rest", "graphql", "microservices", "linux", "agile",
    ]

    jd_skills = [s for s in KNOWN_SKILLS if re.search(r'\b' + re.escape(s) + r'\b', jd_lower)]
    matched = [s for s in jd_skills if any(s in u or u in s for u in user_lower)]
    missing = [s for s in jd_skills if s not in matched]
    score = (len(matched) / max(len(jd_skills), 1)) * 100

    return round(score, 1), matched, missing


# ═══════════════════════════════════════════════
#  ANSWER GENERATION — LLM-powered
# ═══════════════════════════════════════════════

def generate_answer(question: str, user_summary: str, user_skills: List[str], jd_text: str = "", resume_text: str = "") -> str:
    """Generate a tailored answer using the applicant's profile and resume."""
    try:
        system_prompt = (
            "You are a career coach writing tailored answers for job applications. "
            "Use the applicant's profile and resume to craft a concise, professional, and compelling response. "
            "Draw specific examples from their resume (projects, achievements, experience) when relevant. "
            "Sound natural and human — avoid corporate buzzwords and generic filler. "
            "Keep answers under 200 words unless the question demands more."
        )

        jd_section = f"JOB DESCRIPTION:\n{jd_text}\n\n" if jd_text else ""
        resume_section = f"APPLICANT RESUME:\n{resume_text}\n\n" if resume_text else ""

        user_prompt = (
            f"APPLICANT SUMMARY: {user_summary}\n\n"
            f"SKILLS: {', '.join(user_skills)}\n\n"
            f"{resume_section}"
            f"{jd_section}"
            f"QUESTION: {question}\n\n"
            f"Write a personalized answer:"
        )

        return _llm_call(system_prompt, user_prompt, max_tokens=500, temperature=0.7)

    except Exception as e:
        print(f"[AI] LLM answer generation failed: {e}")
        skills_str = ", ".join(user_skills[:8]) if user_skills else "various technologies"
        return (
            f"Based on my background, {user_summary[:200] if user_summary else 'I bring strong technical skills'}. "
            f"My expertise includes {skills_str}. "
            f"I am confident my experience makes me a strong fit for this role."
        )


# ═══════════════════════════════════════════════
#  JD ANALYSIS — LLM-powered
# ═══════════════════════════════════════════════

def parse_job_description(jd_text: str, resume_text: str = "") -> dict:
    """Parse a job description and compare against resume if available."""
    try:
        resume_comparison = ""
        if resume_text:
            resume_comparison = (
                '- "resume_fit": a 1-2 sentence assessment of how well the candidate\'s resume matches this role\n'
                '- "resume_gaps": array of key gaps between the resume and JD requirements\n'
                '- "resume_strengths": array of candidate strengths relevant to this role\n'
            )

        system_prompt = (
            "Extract structured information from the job description. "
            "Return ONLY valid JSON with these keys:\n"
            '- "title": job title\n'
            '- "company": company name\n'
            '- "required_skills": array of required technical/soft skills\n'
            '- "nice_to_have_skills": array of preferred but optional skills\n'
            '- "experience_level": one of "Junior", "Mid-level", "Senior", "Lead", or "Not specified"\n'
            '- "summary": 2-3 sentence summary of the role\n'
            '- "key_responsibilities": array of top 3-5 responsibilities\n'
            f"{resume_comparison}\n"
            "Be thorough and accurate in skill extraction."
        )

        user_prompt = f"JOB DESCRIPTION:\n{jd_text}"
        if resume_text:
            user_prompt += f"\n\nCANDIDATE RESUME:\n{resume_text}"

        raw = _llm_call(system_prompt, user_prompt, max_tokens=800)
        result = _extract_json(raw)

        # Ensure all expected keys exist
        defaults = {
            "title": "Not specified",
            "company": "Not specified",
            "required_skills": [],
            "nice_to_have_skills": [],
            "experience_level": "Not specified",
            "summary": "",
            "key_responsibilities": [],
        }
        for key, default in defaults.items():
            if key not in result:
                result[key] = default

        return result

    except Exception as e:
        print(f"[AI] LLM JD parse failed, using fallback: {e}")
        return _fallback_jd_parse(jd_text)


def _fallback_jd_parse(jd_text: str) -> dict:
    """Naive keyword-based JD parsing when LLM is unavailable."""
    jd_lower = jd_text.lower()

    KNOWN_SKILLS = [
        "python", "javascript", "typescript", "react", "angular", "vue", "node.js",
        "java", "c++", "c#", "go", "rust", "sql", "mongodb", "postgresql",
        "aws", "azure", "gcp", "docker", "kubernetes", "git", "machine learning",
        "deep learning", "nlp", "data science", "html", "css", "fastapi", "django",
    ]
    found_skills = [t for t in KNOWN_SKILLS if re.search(r'\b' + re.escape(t) + r'\b', jd_lower)]

    exp_level = "Not specified"
    if "senior" in jd_lower or "5+ years" in jd_lower:
        exp_level = "Senior"
    elif "junior" in jd_lower or "entry" in jd_lower:
        exp_level = "Junior"
    elif "mid" in jd_lower or "3+ years" in jd_lower:
        exp_level = "Mid-level"

    return {
        "title": "See job description",
        "company": "See job description",
        "required_skills": found_skills,
        "nice_to_have_skills": [],
        "experience_level": exp_level,
        "summary": jd_text[:300] + ("..." if len(jd_text) > 300 else ""),
        "key_responsibilities": [],
    }


# ═══════════════════════════════════════════════
#  AUTO-MAP FIELDS — LLM-powered
# ═══════════════════════════════════════════════

def _best_option_match(value: str, options: list) -> str:
    """
    Snap an AI-returned value to the closest option in the list.
    1. Exact match (case-insensitive)
    2. Option that contains the value, or value contains the option
    3. First option that shares the most words with the value
    Returns "" if no reasonable match found.
    """
    if not value or not options:
        return value

    val_lower = value.lower().strip()

    # 1. Exact match
    for opt in options:
        if opt.lower().strip() == val_lower:
            return opt

    # 2. Containment
    for opt in options:
        opt_lower = opt.lower().strip()
        if val_lower in opt_lower or opt_lower in val_lower:
            return opt

    # 3. Word overlap scoring
    val_words = set(val_lower.split())
    best_opt, best_score = "", 0
    for opt in options:
        shared = val_words & set(opt.lower().split())
        if len(shared) > best_score:
            best_score = len(shared)
            best_opt = opt

    # Only accept if at least one word overlaps
    return best_opt if best_score > 0 else ""


def auto_map_fields(fields: list, profile_data: dict, saved_answers: dict = None, resume_text: str = "") -> dict:
    """
    Use LLM to intelligently map form fields to profile data.
    Also considers previously saved answers from past form submissions.
    Returns a dict of field_id -> suggested value.
    """
    try:
        field_descriptions = []
        for f in fields:
            ftype = f.get('field_type', 'text')
            opts = f.get('options', [])
            if opts:
                # Be very explicit: constrained field — value MUST come from options list
                if ftype == 'checkbox':
                    desc = (
                        f"- field_id: \"{f['field_id']}\", label: \"{f['label']}\", "
                        f"type: checkbox (multi-select) — "
                        f"ALLOWED VALUES (comma-separate multiple): {opts}"
                    )
                else:
                    desc = (
                        f"- field_id: \"{f['field_id']}\", label: \"{f['label']}\", "
                        f"type: {ftype} (single-select) — "
                        f"YOU MUST return EXACTLY one of these options, word-for-word: {opts}"
                    )
            else:
                desc = f"- field_id: \"{f['field_id']}\", label: \"{f['label']}\", type: {ftype}"
            field_descriptions.append(desc)

        fields_text = "\n".join(field_descriptions)

        # Build profile summary for the LLM
        exp_text = ""
        if profile_data.get("experience"):
            for exp in profile_data["experience"]:
                if isinstance(exp, dict):
                    exp_text += f"  - {exp.get('title', '')} at {exp.get('company', '')} ({exp.get('duration', '')})\n"

        edu_text = ""
        if profile_data.get("education"):
            for edu in profile_data["education"]:
                if isinstance(edu, dict):
                    degree = edu.get('degree', '')
                    major = edu.get('major', '')
                    institution = edu.get('institution', '')
                    start_year = edu.get('start_year', '')
                    end_year = edu.get('end_year', edu.get('year', ''))
                    edu_text += f"  - {degree}{(' in ' + major) if major else ''} from {institution} ({start_year}–{end_year})\n"

        profile_text = f"""Full Name: {profile_data.get('full_name', '')}
Email: {profile_data.get('email', '')}
Phone: {profile_data.get('phone', '')}
LinkedIn: {profile_data.get('linkedin', '')}
GitHub: {profile_data.get('github', '')}
Website: {profile_data.get('website', '')}
Resume Link: {profile_data.get('resume_link', '')}
Skills: {', '.join(profile_data.get('skills', []))}
Summary: {profile_data.get('summary', '')}
Experience:
{exp_text}Education:
{edu_text}"""

        # Include saved answers from previous form submissions
        saved_text = ""
        if saved_answers:
            saved_entries = []
            for q, a in saved_answers.items():
                saved_entries.append(f"  Q: {q}\n  A: {a}")
            saved_text = "\n\nPREVIOUSLY SAVED ANSWERS (from past form submissions — reuse these when the form field is similar):\n" + "\n".join(saved_entries)

        system_prompt = (
            "You are a form auto-fill assistant. Given a list of form fields and a user's profile, "
            "determine the best value to fill in each field.\n\n"
            "Return ONLY valid JSON: an object where each key is a field_id and the value is the suggested fill.\n\n"
            "RULES:\n"
            "1. For fields marked 'single-select' (radio/dropdown): your value MUST be EXACTLY one of the listed options, "
            "copied verbatim. Do not paraphrase, abbreviate, or invent a value.\n"
            "2. For fields marked 'multi-select' (checkbox): your value must be a comma-separated list of one or more "
            "of the listed options, copied verbatim.\n"
            "3. For free-text fields: use judgment — map semantically (e.g. '10th standard' → high school institution, "
            "'stream' → the degree subject, 'secondary school' → 12th institution).\n"
            "4. If you cannot determine an appropriate value, set it to an empty string \"\".\n"
            "5. Saved answers from past submissions are high priority — reuse them for similar fields.\n\n"
            "Be smart: 'High School' maps to 12th; 'Undergraduate' maps to B.Tech/B.Sc/B.E; "
            "'Branch/Stream' maps to the major/specialisation; 'Passing year' maps to the graduation year."
        )

        # Include resume text as additional data
        resume_section = ""
        if resume_text:
            resume_section = f"\n\nCANDIDATE RESUME (use for additional context):\n{resume_text}"

        user_prompt = f"FORM FIELDS:\n{fields_text}\n\nUSER PROFILE:\n{profile_text}{saved_text}{resume_section}"

        raw = _llm_call(system_prompt, user_prompt, max_tokens=1000)
        result = _extract_json(raw)

        # Build mapping + post-process constrained fields
        mapping = {}
        for f in fields:
            fid = f["field_id"]
            opts = f.get("options", [])
            ftype = f.get("field_type", "text")
            ai_value = result.get(fid, "")

            if opts and ftype != "checkbox":
                # Single-select: snap to nearest valid option
                snapped = _best_option_match(ai_value, opts)
                mapping[fid] = snapped
                if ai_value and snapped != ai_value:
                    print(f"[AI] Option snapped: '{ai_value}' → '{snapped}' for field '{f['label']}'")
            elif opts and ftype == "checkbox":
                # Multi-select: validate each comma-separated part
                parts = [p.strip() for p in ai_value.split(",") if p.strip()]
                valid_parts = [_best_option_match(p, opts) for p in parts]
                mapping[fid] = ", ".join(v for v in valid_parts if v)
            else:
                mapping[fid] = ai_value

        return {"field_values": mapping}

    except Exception as e:
        print(f"[AI] LLM auto-map failed: {e}")
        mapping = {}
        for f in fields:
            mapping[f["field_id"]] = ""
        return {"field_values": mapping}

