"""
AI Service — All features powered by LLM API (Groq, OpenAI, Ollama, etc.)
Falls back to basic local methods only if LLM_API_KEY is not configured.
"""
import logging
import os
import json
import re
from typing import List, Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)

_key = os.getenv("LLM_API_KEY", "")
logger.info("[AI Service] LLM_API_KEY: %s", "configured" if _key else "NOT SET - using fallback")
logger.info("[AI Service] LLM_API_URL: %s", os.getenv("LLM_API_URL", "not set"))
logger.info("[AI Service] LLM_MODEL: %s", os.getenv("LLM_MODEL", "not set"))

# Module-level cached client to reuse HTTP connection pool
_llm_client_instance = None

_JD_REQUIREMENT_CUES = {
    "requirements", "qualification", "qualifications", "responsibilities", "skills",
    "experience", "must have", "nice to have", "preferred", "role", "job",
    "position", "candidate", "apply", "duties", "what you'll", "what you will",
}

_SKILL_ALIASES = {
    "data structures and algorithms": [
        r"dsa",
        r"data structures and algorithms",
        r"data structures & algorithms",
    ],
    "rest api": [
        r"\bapi\b",
        r"\bapis\b",
        r"rest api",
        r"rest apis",
        r"restful api",
        r"restful apis",
        r"restful",
        r"\brest\b",
        r"restful backend",
    ],
    "sql": [
        r"sql",
        r"relational database",
        r"relational databases",
        r"postgresql",
        r"postgres",
        r"mysql",
        r"sqlite",
    ],
    "nosql": [r"nosql", r"non relational", r"non-relational"],
    "python": [r"python"],
    "javascript": [r"javascript", r"ecmascript"],
    "typescript": [r"typescript"],
    "backend": [r"backend", r"backend systems", r"server-side", r"server side"],
    "react.js": [r"react", r"react\.js", r"reactjs"],
    "angular": [r"angular"],
    "vue": [r"vue"],
    "node.js": [r"node\.js", r"nodejs", r"\bnode\b"],
    "java": [r"java"],
    "c++": [r"c\+\+"],
    "c#": [r"c#"],
    ".net": [r"\.net", r"dotnet"],
    "go": [r"\bgo\b"],
    "rust": [r"rust"],
    "ruby": [r"ruby"],
    "php": [r"php"],
    "swift": [r"swift"],
    "kotlin": [r"kotlin"],
    "mongodb": [r"mongodb"],
    "redis": [r"redis"],
    "elasticsearch": [r"elasticsearch"],
    "aws": [r"aws", r"amazon web services"],
    "azure": [r"azure"],
    "gcp": [r"gcp", r"google cloud"],
    "docker": [r"docker"],
    "kubernetes": [r"kubernetes", r"k8s"],
    "git": [r"\bgit\b", r"github", r"gitlab"],
    "ci/cd": [r"ci/cd", r"ci cd", r"continuous integration", r"continuous delivery"],
    "machine learning": [r"machine learning"],
    "deep learning": [r"deep learning"],
    "nlp": [r"\bnlp\b", r"natural language processing"],
    "data science": [r"data science"],
    "tensorflow": [r"tensorflow"],
    "pytorch": [r"pytorch"],
    "pandas": [r"pandas"],
    "numpy": [r"numpy"],
    "html": [r"html"],
    "css": [r"css"],
    "tailwind": [r"tailwind"],
    "bootstrap": [r"bootstrap"],
    "flask": [r"flask"],
    "django": [r"django"],
    "fastapi": [r"fastapi"],
    "spring": [r"spring"],
    "express": [r"express"],
    "graphql": [r"graphql"],
    "microservices": [r"microservices"],
    "linux": [r"linux"],
    "agile": [r"agile"],
    "scrum": [r"scrum"],
}

_REQUIRED_SECTION_RE = re.compile(
    r"^(requirements?|must\s*have|required\s*skills?|qualifications?|what\s+you(?:'|\u2019)?ll\s+need|skills\s+required)\b",
    re.IGNORECASE,
)
_PREFERRED_SECTION_RE = re.compile(
    r"^(preferred|preferred\s+qualifications?|nice\s*to\s*have|good\s*to\s*have|optional|optionals?|bonus|plus)\b",
    re.IGNORECASE,
)

_PREFERRED_OVERRIDE_LINE_RE = re.compile(
    r"optional\s+but\s+required|nice\s*to\s*have\s+but\s+expected|preferred\s+but\s+important",
    re.IGNORECASE,
)

_SKILL_CANONICAL_MAP = {
    "dsa": "data structures and algorithms",
    "data structures & algorithms": "data structures and algorithms",
    "data structure and algorithms": "data structures and algorithms",
    "rest": "rest api",
    "restful": "rest api",
    "restful api": "rest api",
    "restful apis": "rest api",
    "rest api": "rest api",
    "rest apis": "rest api",
    "relational database": "sql",
    "relational databases": "sql",
    "flask": "rest api",
    "fastapi": "rest api",
    "github": "git",
}

_FALLBACK_EXPLICIT_SKILLS = [
    "python", "java", "javascript", "typescript", "go", "c++", "c#", "php", "ruby", "kotlin", "swift",
    "node.js", "react.js", "angular", "vue",
    "sql", "nosql", "postgresql", "mysql", "sqlite", "mongodb", "redis",
    "rest api", "graphql", "microservices",
    "git", "github", "gitlab", "docker", "kubernetes", "aws", "azure", "gcp",
]

_SOFT_SKILL_TOKENS = {
    "problem-solving", "problem solving", "communication", "teamwork", "leadership",
}

_SEMANTIC_REWRITE_PAIRS = [
    (r"\bcomputer science fundamentals\b", "data structures and algorithms"),
    (r"\bcs fundamentals\b", "data structures and algorithms"),
    (r"\bversion control tools\b", "git"),
    (r"\bversion control\b", "git"),
    (r"\bdata storage\b", "sql"),
    (r"\bdatabases\b", "sql"),
    (r"\bweb services\b", "rest api"),
]

_SAFE_INFERENCE_PATTERNS = [
    (re.compile(r"\b(programming concepts|programming fundamentals)\b", re.IGNORECASE), ["python", "java", "javascript"]),
    (re.compile(r"\b(web applications|backend systems)\b", re.IGNORECASE), ["rest api", "backend"]),
    (re.compile(r"\bdatabases\b", re.IGNORECASE), ["sql"]),
]

_OR_LINE_CUE_RE = re.compile(r"/|\bor\b|\bany of\b|\bone of\b", re.IGNORECASE)
_AND_LINE_CUE_RE = re.compile(r"\band\b|\bmust have\b|\bstrong experience with\b", re.IGNORECASE)

def _compact_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _is_short_jd(jd_text: str) -> bool:
    return len(str(jd_text or "")) < 1500


def _is_minimal_jd(jd_text: str) -> bool:
    words = re.findall(r"[A-Za-z][A-Za-z0-9+#./-]*", str(jd_text or ""))
    return len(words) < 20


def _has_clear_jd_sections(jd_text: str) -> bool:
    for raw_line in str(jd_text or "").splitlines():
        heading = _compact_spaces(raw_line).rstrip(":")
        if _REQUIRED_SECTION_RE.match(heading) or _PREFERRED_SECTION_RE.match(heading):
            return True
    return False


def _normalize_match_text(value: str) -> str:
    text = _apply_semantic_mappings(value).casefold()
    text = text.replace("data structures & algorithms", "dsa")
    text = text.replace("data structures and algorithms", "dsa")
    text = text.replace("web services", "rest api")
    text = text.replace("web service", "rest api")
    text = text.replace("backend systems", "backend")
    text = text.replace("version control", "git")
    text = text.replace("react.js", "react")
    text = text.replace("reactjs", "react")
    return text


def _apply_semantic_mappings(value: str) -> str:
    text = str(value or "")
    for pattern, replacement in _SEMANTIC_REWRITE_PAIRS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def _normalize_skill_label(value: str) -> str:
    """Convert common aliases to one canonical skill label."""
    text = _compact_spaces(value).casefold()
    if not text:
        return ""

    for canonical, patterns in _SKILL_ALIASES.items():
        for pattern in patterns:
            if re.search(rf"(?:^|[^a-z0-9]){pattern}(?:$|[^a-z0-9])", text):
                return canonical

    # fall back to title-casing the cleaned input when no alias is known
    return _compact_spaces(value)


def _normalize_skill_list(values) -> List[str]:
    seen = set()
    normalized = []
    for value in values or []:
        if not isinstance(value, str):
            continue
        label = _canonicalize_skill(value)
        if not label:
            continue
        key = label.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(label)
    return normalized


def _extract_skills_from_text(text: str) -> List[str]:
    lowered = _apply_semantic_mappings(text).casefold()
    found = []
    for canonical, patterns in _SKILL_ALIASES.items():
        for pattern in patterns:
            if re.search(rf"(?:^|[^a-z0-9]){pattern}(?:$|[^a-z0-9])", lowered):
                found.append(canonical)
                break
    return _normalize_skill_list(found)


def _canonical_skill_set(values) -> set:
    return {
        _canonicalize_skill(value)
        for value in (values or [])
        if isinstance(value, str) and _canonicalize_skill(value)
    }


def _extract_jd_sections(jd_text: str) -> Dict[str, str]:
    required_lines: List[str] = []
    preferred_lines: List[str] = []
    other_lines: List[str] = []
    mode = None
    has_clear_sections = False

    for raw_line in str(jd_text or "").splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue
        heading_candidate = line
        inline_tail = ""
        if ":" in line:
            heading_candidate, inline_tail = line.split(":", 1)
            heading_candidate = _compact_spaces(heading_candidate)
            inline_tail = _compact_spaces(inline_tail)

        is_section_header = ":" in line

        if is_section_header and _REQUIRED_SECTION_RE.match(heading_candidate):
            mode = "required"
            has_clear_sections = True
            if inline_tail:
                required_lines.append(inline_tail)
            continue
        if is_section_header and _PREFERRED_SECTION_RE.match(heading_candidate):
            mode = "preferred"
            has_clear_sections = True
            if inline_tail:
                preferred_lines.append(inline_tail)
            continue

        # Contradictory phrasing is treated as preferred by policy.
        if _PREFERRED_OVERRIDE_LINE_RE.search(line):
            preferred_lines.append(line)
            continue

        if mode == "required":
            required_lines.append(line)
        elif mode == "preferred":
            preferred_lines.append(line)
        else:
            other_lines.append(line)

    return {
        "required": "\n".join(required_lines),
        "preferred": "\n".join(preferred_lines),
        "other": "\n".join(other_lines),
    }


def _extract_preferred_lines_without_headers(jd_text: str) -> str:
    lines: List[str] = []
    for raw_line in str(jd_text or "").splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue
        lowered = line.casefold()
        if _PREFERRED_OVERRIDE_LINE_RE.search(line) or any(term in lowered for term in ["preferred", "nice to have", "optional"]):
            lines.append(line)
    return "\n".join(lines)


def _filter_required_by_preferred(required_groups: List[List[str]], preferred_skills: List[str]) -> List[List[str]]:
    preferred_set = {s.casefold() for s in (preferred_skills or [])}
    filtered: List[List[str]] = []
    for group in required_groups or []:
        cleaned = [skill for skill in group if skill.casefold() not in preferred_set]
        if cleaned:
            filtered.append(_dedupe_preserve_order(cleaned))
    return filtered


def _build_focus_jd_text(jd_text: str, max_chars: int = 1500) -> str:
    sections = _extract_jd_sections(jd_text)
    required_text = sections.get("required", "")
    if required_text:
        return required_text[:max_chars]

    focus_lines: List[str] = []
    for raw_line in str(jd_text or "").splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue
        lowered = line.casefold()
        if any(term in lowered for term in ["preferred", "nice to have", "optional"]):
            continue
        if any(cue in lowered for cue in ["require", "qualif", "must have", "skill", "responsibilit", "what you'll", "what you will"]):
            if lowered.startswith(("benefit", "salary", "location", "about us", "company")):
                continue
            focus_lines.append(line)

    if focus_lines:
        focused = "\n".join(focus_lines)
        return focused[:max_chars]

    return _compact_spaces(str(jd_text or ""))[:max_chars]


def _extract_explicit_skills_from_text(text: str) -> List[str]:
    lowered = _apply_semantic_mappings(text).casefold()
    found: List[str] = []
    for skill in _FALLBACK_EXPLICIT_SKILLS:
        if re.search(rf"(?:^|[^a-z0-9]){re.escape(skill.casefold())}(?:$|[^a-z0-9])", lowered):
            found.append(_canonicalize_skill(skill))
    return _dedupe_preserve_order([s for s in found if s])


def _has_explicit_requirements_section(jd_text: str) -> bool:
    for raw_line in str(jd_text or "").splitlines():
        heading = _compact_spaces(raw_line).rstrip(":")
        if heading and _REQUIRED_SECTION_RE.match(heading):
            return True
    return False


def _expected_required_categories(jd_text: str) -> Dict[str, List[str]]:
    text = _apply_semantic_mappings(jd_text).casefold()
    categories: Dict[str, List[str]] = {}

    langs = [s for s in ["python", "java", "javascript", "typescript", "go", "c++", "c#", "php", "ruby"] if re.search(rf"\b{re.escape(s)}\b", text)]
    if langs:
        categories["language"] = langs

    if any(term in text for term in ["api", "web service", "backend", "microservice", "distributed system", "system design"]):
        categories["backend"] = ["rest api", "microservices"]

    if any(term in text for term in ["sql", "database", "databases", "data storage", "postgres", "mysql", "sqlite", "nosql", "relational"]):
        categories["database"] = ["sql", "databases"]

    if any(term in text for term in ["git", "version control", "github", "gitlab"]):
        categories["version_control"] = ["git"]

    return categories


def _is_skill_grounded_in_jd(skill: str, jd_text: str) -> bool:
    lowered = _apply_semantic_mappings(jd_text).casefold()
    canonical = _canonicalize_skill(skill)
    if not canonical:
        return False

    patterns = _SKILL_ALIASES.get(canonical, [])
    for pattern in patterns:
        if re.search(rf"(?:^|[^a-z0-9]){pattern}(?:$|[^a-z0-9])", lowered):
            return True

    return re.search(rf"(?:^|[^a-z0-9]){re.escape(canonical)}(?:$|[^a-z0-9])", lowered) is not None


def _is_structured_extraction_sane(extracted: Dict[str, Any]) -> bool:
    groups = extracted.get("required_skill_groups", [])
    if len(groups) < 3:
        return False
    return all(isinstance(g, list) and len(g) >= 1 and all(isinstance(s, str) and _compact_spaces(s) for s in g) for g in groups)


def _dedupe_preserve_order(values: List[str]) -> List[str]:
    seen = set()
    out = []
    for value in values:
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(value)
    return out


def _split_diluted_backend_group(group: List[str]) -> List[List[str]]:
    """Split mixed generic-backend + advanced-concept groups to avoid dilution."""
    normalized_group = _dedupe_preserve_order([
        _canonicalize_skill(skill) for skill in (group or []) if _canonicalize_skill(skill)
    ])
    if not normalized_group:
        return []

    generic_terms = {"backend", "rest api"}
    advanced_terms = {
        "microservices",
        "system design",
        "distributed systems",
        "distributed system",
        "scalability",
        "concurrency",
    }

    has_generic = any(skill in generic_terms for skill in normalized_group)
    has_advanced = any(skill in advanced_terms for skill in normalized_group)

    if has_generic and has_advanced:
        return [[skill] for skill in normalized_group]

    return [normalized_group]


def _extract_skill_groups(text: str) -> List[List[str]]:
    groups: List[List[str]] = []
    seen = set()
    line_context: List[Tuple[str, bool]] = []

    def _append_group(group: List[str]) -> None:
        deduped_group = _dedupe_preserve_order(group)
        for split_group in _split_diluted_backend_group(deduped_group):
            if not split_group:
                continue
            key = tuple(split_group)
            if key in seen:
                continue
            seen.add(key)
            groups.append(split_group)

    for raw_line in _apply_semantic_mappings(text).splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue

        line_found = _extract_skills_from_text(line)

        if not line_found:
            line_context.append((line, False))
            continue

        has_or_cue = bool(_OR_LINE_CUE_RE.search(line))
        has_and_cue = bool(_AND_LINE_CUE_RE.search(line))

        if has_or_cue and len(line_found) >= 2:
            _append_group(line_found)
        elif has_and_cue and len(line_found) >= 2:
            for skill in line_found:
                _append_group([skill])
        elif len(line_found) == 1:
            _append_group(line_found)
        else:
            # Conservative default: without explicit OR cues, treat multi-skill lines as mandatory skills.
            for skill in line_found:
                _append_group([skill])

        line_context.append((line, True))

    def _infer_group_from_line(line: str) -> List[str]:
        inferred: List[str] = []
        for pattern, target_group in _SAFE_INFERENCE_PATTERNS:
            if pattern.search(line):
                inferred.extend(target_group)
        return _normalize_skill_list(inferred)

    # Controlled inference for sparse or vague JDs only.
    # Apply when a line has no explicit skill OR the extracted group count is too small.
    if len(groups) < 3:
        for line, had_explicit in line_context:
            if had_explicit and len(groups) >= 3:
                continue
            inferred_group = _infer_group_from_line(line)
            if not inferred_group:
                continue
            key = tuple(inferred_group)
            if key in seen:
                continue
            seen.add(key)
            groups.append(inferred_group)
            if len(groups) >= 3:
                break

    # Hard fallback expansion when extraction is critically small.
    if len(groups) < 2:
        for line, _had_explicit in line_context:
            inferred_group = _infer_group_from_line(line)
            if not inferred_group:
                continue
            key = tuple(inferred_group)
            if key in seen:
                continue
            seen.add(key)
            groups.append(inferred_group)
            if len(groups) >= 2:
                break

    return groups


def _group_label(group: List[str]) -> str:
    if len(group) <= 1:
        return group[0] if group else ""
    return " or ".join(group)


def _extract_candidate_skills(user_skills: List[str], user_summary: str, resume_text: str = "") -> List[str]:
    # Prioritize explicit profile skills, then expand with summary/resume evidence.
    profile_skills = _normalize_skill_list(user_skills)
    summary_skills = _extract_skills_from_text(user_summary)
    resume_skills = _extract_skills_from_text(resume_text)
    return _dedupe_preserve_order(profile_skills + summary_skills + resume_skills)


def _extract_project_evidence_text(user_summary: str, resume_text: str) -> str:
    text = f"{user_summary or ''}\n{resume_text or ''}"
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    project_markers = [
        "project", "built", "developed", "implemented", "designed", "created",
        "backend", "api", "rest", "database", "sql", "full stack", "full-stack",
    ]

    evidence_lines = [
        line for line in lines
        if any(marker in line.casefold() for marker in project_markers)
    ]
    if evidence_lines:
        return "\n".join(evidence_lines)
    return text


def _compute_experience_score(required_groups: List[List[str]], project_skills: List[str], has_internship: bool) -> float:
    project_skill_set = {skill.casefold() for skill in project_skills}
    has_project_evidence = len(project_skill_set) > 0
    has_api = "rest api" in project_skill_set
    has_db = "sql" in project_skill_set
    has_fullstack = "full-stack" in project_skill_set

    total_required = len(required_groups)
    if total_required == 0:
        return 30.0

    demonstrated = 0
    for group in required_groups:
        if any(skill.casefold() in project_skill_set for skill in group):
            demonstrated += 1

    project_ratio = round((demonstrated / total_required) * 100)

    if has_internship:
        return float(max(80, min(100, project_ratio)))

    strong_projects = has_project_evidence and ((has_api and has_db) or has_fullstack)
    if strong_projects:
        return float(max(60, min(80, project_ratio)))

    if has_project_evidence or demonstrated > 0:
        return float(max(40, min(60, project_ratio)))

    return float(max(0, min(30, project_ratio)))


def _compute_group_skill_matches(required_groups: List[List[str]], candidate_skills: List[str]) -> Tuple[List[List[str]], List[List[str]], List[str], List[str]]:
    """Compute matched/missing required groups and keyword views from structured groups only."""
    candidate_skill_set = _canonical_skill_set(candidate_skills)

    matched_required_skills: List[List[str]] = []
    missing_required_skills: List[List[str]] = []
    matched_keywords: List[str] = []
    seen_keywords = set()

    for group in required_groups or []:
        matched_tokens = [skill for skill in group if _canonicalize_skill(skill) in candidate_skill_set]
        if matched_tokens:
            matched_required_skills.append(group)
            for token in matched_tokens:
                key = token.casefold()
                if key not in seen_keywords:
                    seen_keywords.add(key)
                    matched_keywords.append(token)
        else:
            missing_required_skills.append(group)

    missing_keywords = [_group_label(group) for group in missing_required_skills]
    return matched_required_skills, missing_required_skills, matched_keywords, missing_keywords


def _build_jd_keywords(required_groups: List[List[str]], preferred_skills: List[str]) -> List[str]:
    """Flatten structured JD skills into a canonical keyword list."""
    return _normalize_skill_list([
        skill
        for group in (required_groups or [])
        for skill in (group or [])
    ] + list(preferred_skills or []))


def _compute_keyword_coverage(required_groups: List[List[str]], preferred_skills: List[str], candidate_skills: List[str]) -> Tuple[List[str], List[str], float]:
    """Compute keyword coverage from structured JD skills against canonical user skills."""
    jd_keywords = _build_jd_keywords(required_groups, preferred_skills)
    candidate_skill_set = _canonical_skill_set(candidate_skills)
    matched_keywords = [kw for kw in jd_keywords if kw in candidate_skill_set]
    matched_set = {kw.casefold() for kw in matched_keywords}
    missing_keywords = [kw for kw in jd_keywords if kw.casefold() not in matched_set]
    total_keywords = len(jd_keywords)
    keyword_score = round((len(matched_keywords) / total_keywords) * 100) if total_keywords else 0.0
    return matched_keywords, missing_keywords, float(keyword_score)


def _actionable_suggestion_for_group(group: List[str]) -> str:
    """Turn a missing required group into a concrete resume action."""
    label = _group_label(group).casefold()

    if any(term in label for term in ["rest api", "api", "web service"]):
        return "Build a CRUD API using Flask or Node.js"
    if any(term in label for term in ["sql", "database", "postgres", "mysql", "sqlite", "mongodb", "redis"]):
        return "Add database integration using PostgreSQL or MySQL"
    if any(term in label for term in ["react", "angular", "vue", "frontend", "ui"]):
        return "Build and deploy a frontend project"
    if any(term in label for term in ["git", "github", "gitlab", "version control"]):
        return "Use Git in a collaborative project and push the work to GitHub"
    if any(term in label for term in ["docker", "kubernetes", "container"]):
        return "Containerize a project with Docker and deploy it"

    return f"Add a project demonstrating { _group_label(group) }"


def _resume_evidence_skills(required_groups: List[List[str]], resume_text: str, candidate_project_skills: List[str]) -> List[str]:
    """Return required-skill tokens evidenced in resume text/project evidence."""
    resume_lower = str(resume_text or "").casefold()
    project_set = {s.casefold() for s in (candidate_project_skills or [])}

    evidence: List[str] = []
    seen = set()

    for group in required_groups or []:
        for skill in group:
            key = skill.casefold()
            if key in seen:
                continue

            in_project = key in project_set
            in_resume = False
            for pattern in _SKILL_ALIASES.get(skill, [re.escape(skill)]):
                if re.search(rf"(?:^|[^a-z0-9]){pattern}(?:$|[^a-z0-9])", resume_lower):
                    in_resume = True
                    break

            if in_project or in_resume:
                seen.add(key)
                evidence.append(skill)

    return evidence


def _generate_resume_fit_analysis(
    required_groups: List[List[str]],
    matched_keywords: List[str],
    missing_keywords: List[str],
    resume_text: str,
) -> Dict[str, Any]:
    """Generate LLM-based resume fit summary using structured group match outputs."""
    total_required = len(required_groups or [])
    matched_count = total_required - len(missing_keywords or [])
    match_ratio = (matched_count / total_required) if total_required else 0.0
    if total_required == 0:
        return {
            "resume_fit": "Resume fit analysis is limited because no required skill groups were extracted from the job description.",
            "resume_strengths": [],
            "resume_gaps": [],
        }

    matched_preview = ", ".join((matched_keywords or [])[:3])
    missing_preview = ", ".join((missing_keywords or [])[:3])

    if match_ratio >= 0.95:
        resume_fit = (
            "Strong match. Your profile covers all core requirements including "
            f"{matched_preview}. "
            "You are well-aligned with the role, but improving project depth or real-world deployment experience will strengthen your application further."
        )
    elif match_ratio >= 0.75:
        resume_fit = (
            "Good match. You meet most core requirements such as "
            f"{matched_preview}, "
            f"but are missing areas like {', '.join((missing_keywords or [])[:2])}. "
            "Adding targeted projects or practical experience in these areas will significantly improve your fit."
        )
    elif match_ratio >= 0.5:
        resume_fit = (
            "Moderate match. You have some relevant skills like "
            f"{', '.join((matched_keywords or [])[:2])}, "
            f"but important gaps exist such as {', '.join((missing_keywords or [])[:3])}. "
            "You should focus on building projects and strengthening fundamentals in these areas."
        )
    else:
        resume_fit = (
            "Low match. Your current profile lacks several core requirements such as "
            f"{missing_preview}. "
            "Significant upskilling and hands-on project work are needed to align with this role."
        )

    resume_strengths = [
        f"Demonstrated skills in {', '.join((matched_keywords or [])[:4])}"
    ] if matched_keywords else []
    resume_gaps = missing_keywords[:5]

    return {
        "resume_fit": resume_fit,
        "resume_strengths": resume_strengths,
        "resume_gaps": resume_gaps,
    }


def _infer_experience_level(text: str, title: str = "") -> str:
    haystack = f"{title} {text}".casefold()
    if any(term in haystack for term in ["intern", "internship", "summer intern", "student intern"]):
        return "Intern"
    if any(term in haystack for term in ["senior", "sr.", "lead", "principal", "staff"]):
        return "Senior"
    if any(term in haystack for term in ["junior", "jr.", "entry level", "entry-level", "new grad", "graduate"]):
        return "Junior"
    if any(term in haystack for term in ["mid-level", "mid level", "3+ years", "3 years", "mid"]):
        return "Mid-level"
    return "Not specified"


def _get_llm_client():
    """Return cached OpenAI-compatible client. Returns (client, model) or (None, model)."""
    global _llm_client_instance
    api_key = os.getenv("LLM_API_KEY", "")
    api_url = os.getenv("LLM_API_URL", "https://api.openai.com/v1")
    model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

    if not api_key:
        return None, model

    if _llm_client_instance is None:
        from openai import OpenAI
        _llm_client_instance = OpenAI(api_key=api_key, base_url=api_url)
        logger.info("[AI Service] LLM client initialized (cached for reuse)")

    return _llm_client_instance, model


def _llm_call(system_prompt: str, user_prompt: str, max_tokens: int = 800, temperature: float = 0.3) -> str:
    """Make an LLM API call. Returns the response text or raises."""
    client, model = _get_llm_client()
    if client is None:
        raise ValueError("LLM_API_KEY not configured")

    logger.info(f"[AI Service] Making LLM call to model: {model}")
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=30,  # prevent indefinite hangs in production
        )
        result = response.choices[0].message.content.strip()
        logger.info(f"[AI Service] LLM call succeeded, response length: {len(result)}")
        return result
    except Exception as e:
        logger.error(f"[AI Service] *** LLM CALL FAILED: {type(e).__name__}: {e}")
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


def _canonicalize_skill(value: str) -> str:
    raw = _apply_semantic_mappings(value).casefold()
    if not raw:
        return ""
    if raw in _SKILL_CANONICAL_MAP:
        return _SKILL_CANONICAL_MAP[raw]
    normalized = _normalize_skill_label(raw)
    return _SKILL_CANONICAL_MAP.get(normalized, normalized)


def _normalize_skill_tokens(values) -> List[str]:
    out: List[str] = []
    seen = set()
    for value in values or []:
        if not isinstance(value, str):
            continue
        parts = re.split(r"\s+or\s+|/|,", value, flags=re.IGNORECASE)
        for part in parts:
            token = _canonicalize_skill(part)
            if not token:
                continue
            key = token.casefold()
            if key in seen:
                continue
            seen.add(key)
            out.append(token)
    return out


def _group_category(skill: str) -> str:
    token = _canonicalize_skill(skill)
    language_skills = {
        "python", "java", "javascript", "typescript", "go", "c++", "c#", "php", "ruby", "kotlin", "swift",
    }
    backend_skills = {
        "rest api", "backend", "microservices", "graphql", "node.js", "flask", "django", "fastapi", "spring", "express",
    }
    database_skills = {
        "sql", "mongodb", "redis", "elasticsearch", "postgresql", "postgres", "mysql", "sqlite", "nosql",
    }
    tool_skills = {
        "git", "docker", "kubernetes", "ci/cd", "linux", "aws", "azure", "gcp",
    }

    if token in language_skills:
        return "programming_languages"
    if token in backend_skills:
        return "backend_api"
    if token in database_skills:
        return "database"
    if token in tool_skills:
        return "tools"
    return "other"


def _split_overmerged_required_group(group: List[str]) -> List[List[str]]:
    buckets: Dict[str, List[str]] = {
        "programming_languages": [],
        "backend_api": [],
        "database": [],
        "tools": [],
        "other": [],
    }

    for skill in group:
        token = _canonicalize_skill(skill)
        if not token:
            continue
        category = _group_category(token)
        buckets[category].append(token)

    split_groups: List[List[str]] = []
    for key in ["programming_languages", "backend_api", "database", "tools", "other"]:
        skills = _dedupe_preserve_order(buckets[key])
        if skills:
            split_groups.append(skills)

    return split_groups or [_dedupe_preserve_order(group)]


def _normalize_skill_groups(values) -> List[List[str]]:
    groups: List[List[str]] = []
    seen = set()

    def _append_group(raw_values: List[str]) -> None:
        normalized_group = _normalize_skill_tokens(raw_values)
        for split_group in _split_diluted_backend_group(normalized_group):
            if not split_group:
                continue
            key = tuple(split_group)
            if key in seen:
                continue
            seen.add(key)
            groups.append(split_group)

    for item in values or []:
        if isinstance(item, str):
            # Preserve one normalized group per source line.
            for line in _apply_semantic_mappings(item).splitlines():
                line = _compact_spaces(line)
                if not line:
                    continue
                _append_group([line])
        elif isinstance(item, list):
            raw_group = [v for v in item if isinstance(v, str)]
            _append_group(raw_group)
        else:
            continue

    if len(groups) == 1 and len(groups[0]) > 5:
        groups = _split_overmerged_required_group(groups[0])
    return groups


def _extract_role_title_from_jd(jd_text: str) -> str:
    for line in str(jd_text or "").splitlines():
        clean = _compact_spaces(line)
        if not clean:
            continue
        if re.search(r"\b(engineer|developer|analyst|scientist|intern|manager|architect)\b", clean, re.IGNORECASE):
            return clean[:120]
    return "Not specified"


def _build_jd_analysis_output(extracted: Dict[str, Any], jd_text: str, resume_text: str) -> Dict[str, Any]:
    required_groups = extracted.get("required_skill_groups", [])
    candidate_project_skills = extracted.get("candidate_project_skills", [])
    resume_evidence_skills = _resume_evidence_skills(required_groups, resume_text, candidate_project_skills)
    (
        _matched_required_skills,
        _missing_required_skills,
        matched_keywords,
        missing_keywords,
    ) = _compute_group_skill_matches(required_groups, resume_evidence_skills)
    resume_fit_payload = _generate_resume_fit_analysis(
        required_groups=required_groups,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        resume_text=resume_text,
    )

    title = extracted.get("title", "Not specified")
    inferred_level = _infer_experience_level(jd_text, title)
    experience_level = inferred_level if inferred_level != "Not specified" else extracted.get("experience_level", "Not specified")

    resume_fit = resume_fit_payload.get("resume_fit", "")
    summary_text = extracted.get("summary", "") or (_compact_spaces(jd_text[:300]) + ("..." if len(jd_text) > 300 else ""))
    if _is_minimal_jd(jd_text):
        notice = "This is a short JD. Results are based on limited information."
        if notice.casefold() not in summary_text.casefold():
            summary_text = f"{notice} {summary_text}".strip()

    return {
        "title": title,
        "company": extracted.get("company", "Not specified"),
        "required_skills": required_groups,
        "preferred_skills": _dedupe_preserve_order(extracted.get("preferred_skills", [])),
        "nice_to_have_skills": _dedupe_preserve_order(extracted.get("preferred_skills", [])),
        "experience_level": experience_level,
        "summary": summary_text,
        "key_responsibilities": extracted.get("key_responsibilities", []),
        "resume_fit": resume_fit,
        "resume_fit_analysis": resume_fit,
        "resume_gaps": resume_fit_payload.get("resume_gaps", missing_keywords[:5]),
        "resume_strengths": resume_fit_payload.get("resume_strengths", []),
    }


def _fallback_structured_extraction(jd_text: str, user_summary: str, resume_text: str, user_skills: List[str]) -> Dict[str, Any]:
    sections = _extract_jd_sections(jd_text)
    has_clear_sections = _has_clear_jd_sections(jd_text)
    required_source = sections["required"] if has_clear_sections else _build_focus_jd_text(jd_text)
    preferred_source = sections["preferred"] if has_clear_sections else _extract_preferred_lines_without_headers(jd_text)

    required_groups = _extract_skill_groups(required_source)
    if not required_groups:
        required_explicit = _extract_explicit_skills_from_text(required_source)
        required_groups = [[s] for s in required_explicit]

    filtered_required_groups: List[List[str]] = []
    for group in required_groups:
        cleaned_group = [skill for skill in group if _compact_spaces(skill).casefold() not in _SOFT_SKILL_TOKENS]
        if cleaned_group:
            filtered_required_groups.append(_dedupe_preserve_order(cleaned_group))
    required_groups = filtered_required_groups

    preferred_skills = _dedupe_preserve_order(_extract_explicit_skills_from_text(preferred_source))
    required_groups = _filter_required_by_preferred(required_groups, preferred_skills)

    profile_explicit = _extract_explicit_skills_from_text(" ".join(user_skills or []))
    summary_explicit = _extract_explicit_skills_from_text(user_summary)
    resume_explicit = _extract_explicit_skills_from_text(resume_text)
    candidate_skills = _dedupe_preserve_order(profile_explicit + summary_explicit + resume_explicit)
    project_evidence_text = _extract_project_evidence_text(user_summary, resume_text)
    candidate_project_skills = _extract_explicit_skills_from_text(project_evidence_text)

    return {
        "title": _extract_role_title_from_jd(jd_text),
        "company": "Not specified",
        "summary": _compact_spaces(jd_text[:300]) + ("..." if len(jd_text) > 300 else ""),
        "experience_level": _infer_experience_level(jd_text),
        "required_skill_groups": required_groups,
        "preferred_skills": preferred_skills,
        "candidate_skills": candidate_skills,
        "candidate_project_skills": candidate_project_skills,
        "candidate_has_internship": any(term in project_evidence_text.casefold() for term in ["intern", "internship"]),
        "key_responsibilities": [],
    }


def _extract_minimal_required_groups(text: str) -> List[List[str]]:
    groups: List[List[str]] = []
    seen = set()
    for raw_line in _apply_semantic_mappings(text).splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue
        found = _extract_skills_from_text(line)
        if not found:
            continue
        has_or_cue = bool(_OR_LINE_CUE_RE.search(line))
        if has_or_cue and len(found) >= 2:
            for split_group in _split_diluted_backend_group(found):
                key = tuple(split_group)
                if key in seen:
                    continue
                seen.add(key)
                groups.append(split_group)
            continue
        # Minimal mode: no implicit grouping. Keep explicit skills as separate required entries.
        for skill in found:
            key = (skill,)
            if key in seen:
                continue
            seen.add(key)
            groups.append([skill])
    return groups


def _minimal_structured_extraction(jd_text: str, user_summary: str, resume_text: str, user_skills: List[str]) -> Dict[str, Any]:
    sections = _extract_jd_sections(jd_text)
    has_clear_sections = _has_clear_jd_sections(jd_text)

    if has_clear_sections:
        required_source = sections.get("required", "") or sections.get("other", "")
        preferred_source = sections.get("preferred", "")
    else:
        required_lines: List[str] = []
        preferred_lines: List[str] = []
        for raw_line in str(jd_text or "").splitlines():
            line = _compact_spaces(raw_line)
            if not line:
                continue
            lowered = line.casefold()
            if _PREFERRED_OVERRIDE_LINE_RE.search(line) or any(term in lowered for term in ["preferred", "nice to have", "optional"]):
                preferred_lines.append(line)
            else:
                required_lines.append(line)
        required_source = "\n".join(required_lines)
        preferred_source = "\n".join(preferred_lines)

    required_groups = _extract_minimal_required_groups(required_source)
    preferred_skills = _extract_explicit_skills_from_text(preferred_source)
    required_groups = _filter_required_by_preferred(required_groups, preferred_skills)

    profile_explicit = _extract_explicit_skills_from_text(" ".join(user_skills or []))
    summary_explicit = _extract_explicit_skills_from_text(user_summary)
    resume_explicit = _extract_explicit_skills_from_text(resume_text)
    candidate_skills = _dedupe_preserve_order(profile_explicit + summary_explicit + resume_explicit)
    project_evidence_text = _extract_project_evidence_text(user_summary, resume_text)
    candidate_project_skills = _extract_explicit_skills_from_text(project_evidence_text)

    return {
        "title": _extract_role_title_from_jd(jd_text),
        "company": "Not specified",
        "summary": "This is a short JD. Results are based on limited information.",
        "experience_level": _infer_experience_level(jd_text),
        "required_skill_groups": required_groups,
        "preferred_skills": _dedupe_preserve_order(preferred_skills),
        "candidate_skills": candidate_skills,
        "candidate_project_skills": candidate_project_skills,
        "candidate_has_internship": any(term in project_evidence_text.casefold() for term in ["intern", "internship"]),
        "key_responsibilities": [],
    }


def _validate_structured_extraction_payload(payload: Dict[str, Any], jd_text: str) -> Dict[str, Any]:
    use_relaxed_validation = len(str(jd_text or "")) < 1500
    use_minimal_mode = _is_minimal_jd(jd_text)
    has_clear_sections = _has_clear_jd_sections(jd_text)
    sections = _extract_jd_sections(jd_text)
    required_reference_text = sections["required"] if has_clear_sections else _build_focus_jd_text(jd_text)
    preferred_reference_text = sections["preferred"] if has_clear_sections else _extract_preferred_lines_without_headers(jd_text)

    result = {
        "title": _compact_spaces(str(payload.get("title", "Not specified"))) or "Not specified",
        "company": _compact_spaces(str(payload.get("company", "Not specified"))) or "Not specified",
        "summary": _compact_spaces(str(payload.get("summary", ""))),
        "experience_level": _compact_spaces(str(payload.get("experience_level", "Not specified"))) or "Not specified",
        "required_skill_groups": _normalize_skill_groups(payload.get("required_skill_groups", [])),
        "preferred_skills": _normalize_skill_tokens(payload.get("preferred_skills", [])),
        "candidate_skills": _normalize_skill_tokens(payload.get("candidate_skills", [])),
        "candidate_project_skills": _normalize_skill_tokens(payload.get("candidate_project_skills", [])),
        "candidate_has_internship": bool(payload.get("candidate_has_internship", False)),
        "key_responsibilities": [
            _compact_spaces(v)
            for v in payload.get("key_responsibilities", [])
            if isinstance(v, str) and _compact_spaces(v)
        ][:5],
    }

    result["required_skill_groups"] = _filter_required_by_preferred(result["required_skill_groups"], result["preferred_skills"])

    if not use_relaxed_validation:
        filtered_required: List[List[str]] = []
        preferred_section_skills = set(_extract_skills_from_text(preferred_reference_text)) if preferred_reference_text else set()
        for group in result["required_skill_groups"]:
            cleaned = []
            for skill in group:
                label = _compact_spaces(skill).casefold()
                if label in _SOFT_SKILL_TOKENS:
                    continue
                if preferred_section_skills and skill in preferred_section_skills:
                    continue
                cleaned.append(skill)
            if cleaned:
                filtered_required.append(_dedupe_preserve_order(cleaned))
        result["required_skill_groups"] = filtered_required

        # JD-grounded pruning to prevent hallucinated skills.
        pruned_groups: List[List[str]] = []
        for group in result["required_skill_groups"]:
            grounded = [s for s in group if _is_skill_grounded_in_jd(s, required_reference_text)]
            if grounded:
                pruned_groups.append(_dedupe_preserve_order(grounded))
        result["required_skill_groups"] = pruned_groups
        if preferred_reference_text:
            result["preferred_skills"] = [s for s in result["preferred_skills"] if _is_skill_grounded_in_jd(s, preferred_reference_text)]

    required_count = len(result["required_skill_groups"])
    if use_minimal_mode:
        # Minimal mode accepts sparse extraction without strict group-count requirements.
        return result

    if required_count == 0:
        if use_relaxed_validation:
            logger.warning("[AI] Accepting partial extraction (relaxed mode, no required groups)")
            return result
        raise ValueError("Missing required_skill_groups in structured extraction")

    if use_relaxed_validation:
        # Accept partial outputs for small/medium JDs after normalization only.
        return result

    # Strict validation path keeps grounding and section-based pruning above.

    return result


def _extract_structured_skill_data(jd_text: str, user_summary: str, resume_text: str, user_skills: List[str]) -> Dict[str, Any]:
    if _is_minimal_jd(jd_text):
        return _minimal_structured_extraction(jd_text, user_summary, resume_text, user_skills)

    base_prompt = (
        "Extract deterministic ATS data as STRICT JSON only. "
        "Do not include explanations or markdown.\n"
        "Required JSON keys:\n"
        "- title: string\n"
        "- company: string\n"
        "- summary: string\n"
        "- experience_level: one of Intern, Junior, Mid-level, Senior, Lead, Not specified\n"
        "- required_skill_groups: array of arrays for OR groups (example [[\"python\",\"java\"],[\"sql\"]])\n"
        "- preferred_skills: array of strings\n"
        "- candidate_skills: array of strings from profile/resume\n"
        "- candidate_project_skills: array of strings demonstrated in project/internship evidence\n"
        "- candidate_has_internship: boolean\n"
        "- key_responsibilities: array of up to 5 strings\n"
        "Rules:\n"
        "0) Split JD by section first: required lines from Requirements/Qualifications/Must-have, preferred lines from Preferred/Nice-to-have/Optional.\n"
        "1) Put only REQUIRED skills in required_skill_groups.\n"
        "2) Put only preferred/nice-to-have in preferred_skills.\n"
        "2a) Section priority is strict: any skill under Preferred/Nice-to-have/Optional sections MUST stay in preferred_skills, regardless of strong wording in the line.\n"
        "2b) Phrase overrides are strict preferred: 'optional but required', 'nice to have but expected', and 'preferred but important' MUST be classified as preferred_skills only.\n"
        "2c) Never upgrade preferred_skills to required_skill_groups due to emphasis, capitalization, repetition, or imperative language.\n"
        "2d) Process required and preferred sections independently; do not normalize or merge skills across sections.\n"
        "2e) Final safety filter: remove any required skill that also appears in preferred_skills.\n"
        "3) Keep OR conditions grouped.\n"
        "4) Skill tokens should be concise canonical terms.\n"
        "5) Map high-level descriptions to standard technical skills where appropriate.\n"
        "6) Never return raw phrases like 'relational or nosql'; normalize to canonical tokens like sql or databases.\n"
        "7) Do not place preferred, optional, or soft skills into required_skill_groups.\n"
        "8) Avoid extracting responsibilities, benefits, or company description text as skills.\n"
        "Semantic mapping examples:\n"
        "- computer science fundamentals / CS fundamentals -> data structures and algorithms\n"
        "- programming concepts / programming fundamentals -> python or java or javascript\n"
        "- web applications / backend systems -> rest api or backend\n"
        "- databases -> sql\n"
        "- version control / version control tools -> git\n"
        "- data storage / databases -> sql\n"
        "- web services -> rest api\n"
    )

    strict_retry_prompt = (
        base_prompt
        + "\nSTRICT RETRY MODE:\n"
          "- Extract at least 4 required skill groups when a Requirements section exists.\n"
          "- Ensure required skills include programming language, backend/system skill, database skill, and version control if present in JD.\n"
          "- Do not skip implicit technical requirements.\n"
    )

    llm_jd_text = _build_focus_jd_text(jd_text, max_chars=2000)

    user_prompt = (
        f"JOB DESCRIPTION:\n{llm_jd_text}\n\n"
        f"CANDIDATE PROFILE SKILLS:\n{', '.join(user_skills or [])}\n\n"
        f"CANDIDATE SUMMARY:\n{user_summary or ''}\n\n"
        f"CANDIDATE RESUME:\n{resume_text or ''}"
    )

    fallback = _fallback_structured_extraction(jd_text, user_summary, resume_text, user_skills)

    if not os.getenv("LLM_API_KEY", "").strip():
        logger.warning("Running in fallback mode (reduced accuracy)")
        return fallback

    for attempt in range(2):
        try:
            prompt = base_prompt if attempt == 0 else strict_retry_prompt
            raw = _llm_call(prompt, user_prompt, max_tokens=1000, temperature=0.0)
            parsed = _extract_json(raw)
            validated = _validate_structured_extraction_payload(parsed, jd_text)
            return validated
        except Exception as e:
            logger.warning(f"[AI] Structured extraction attempt {attempt + 1} failed: {e}")

    logger.warning("[AI] Falling back after two failed LLM extraction attempts")
    return fallback


def _jd_quality_metrics(jd_text: str) -> dict:
    """Compute simple quality signals to reject meaningless JD input."""
    text = str(jd_text or "").strip()
    words = re.findall(r"[A-Za-z][A-Za-z0-9+#./-]*", text)
    lowered = text.lower()
    alpha_chars = sum(1 for c in text if c.isalpha())
    unique_words = {w.lower() for w in words}

    return {
        "word_count": len(words),
        "unique_word_count": len(unique_words),
        "char_count": len(text),
        "alpha_ratio": (alpha_chars / max(len(text), 1)),
        "has_requirement_cues": any(cue in lowered for cue in _JD_REQUIREMENT_CUES),
    }


def validate_job_description(jd_text: str) -> Tuple[bool, str]:
    """Return whether a JD looks valid enough for analysis and match scoring."""
    m = _jd_quality_metrics(jd_text)
    detected_skills = _extract_explicit_skills_from_text(jd_text)
    if m["char_count"] < 8:
        return False, "Job description is too short. Please paste the full JD text."
    if m["word_count"] < 20 and len(detected_skills) >= 1:
        return True, ""
    if m["word_count"] < 15:
        return False, "Job description is very short and has no recognizable skills. Please add at least one technical requirement."
    if m["unique_word_count"] < 10 and len(detected_skills) == 0:
        return False, "Job description appears too repetitive or incomplete. Please paste the actual JD content."
    if m["alpha_ratio"] < 0.45:
        return False, "Job description looks malformed. Please paste readable JD text."
    if not m["has_requirement_cues"] and m["word_count"] < 35 and len(detected_skills) == 0:
        return False, "Please provide a fuller JD including requirements/responsibilities for accurate analysis."
    return True, ""


# ═══════════════════════════════════════════════
#  SKILL MATCHING — LLM-powered
# ═══════════════════════════════════════════════

def compute_match_score(user_skills: List[str], user_summary: str, jd_text: str, resume_text: str = "") -> dict:
    """
    Use LLM with a structured 4-dimension rubric to score the candidate against the JD.
    Dimensions: keyword coverage (40%), skills match (30%), experience (20%), education (10%).
    Returns a dict compatible with MatchResponse schema.
    """
    is_valid_jd, invalid_reason = validate_job_description(jd_text)
    if not is_valid_jd:
        return {
            "match_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "preferred_skills_matched": [],
            "breakdown": {
                "keyword_score": 0.0,
                "skills_score": 0.0,
                "experience_score": 0.0,
                "education_score": 0.0,
            },
            "matched_keywords": [],
            "missing_keywords": [],
            "suggestions": [invalid_reason],
            "reasoning": "JD input is not detailed enough for reliable scoring.",
        }

    extracted = _extract_structured_skill_data(jd_text, user_summary, resume_text, user_skills)

    required_groups = extracted["required_skill_groups"]
    preferred_skills = extracted["preferred_skills"]
    candidate_skills = extracted["candidate_skills"]
    candidate_project_skills = extracted["candidate_project_skills"]
    candidate_has_internship = extracted["candidate_has_internship"]
    resume_evidence_skills = _resume_evidence_skills(required_groups, resume_text, candidate_project_skills)
    combined_candidate_skills = _dedupe_preserve_order(candidate_skills + resume_evidence_skills)

    (
        matched_required_skills,
        missing_required_skills,
        _matched_required_keywords,
        _missing_required_keywords,
    ) = _compute_group_skill_matches(required_groups, combined_candidate_skills)

    matched_keywords, missing_keywords, keyword_score = _compute_keyword_coverage(required_groups, preferred_skills, combined_candidate_skills)

    matched_required = len(matched_required_skills)
    total_required = len(required_groups)
    skills_match_score = round((matched_required / total_required) * 100) if total_required else 0
    kw_score = keyword_score
    sk_score = skills_match_score

    candidate_all_text = _normalize_match_text((resume_text or "") + " " + " ".join(candidate_skills or []))
    preferred_skills_matched = [
        s for s in preferred_skills
        if _normalize_match_text(s) in candidate_all_text
    ]

    resume_fit_payload = _generate_resume_fit_analysis(
        required_groups=required_groups,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        resume_text=resume_text,
    )
    resume_fit_text = resume_fit_payload.get("resume_fit", "")

    # Deterministic experience score from JD skills demonstrated in project/internship evidence.
    ex_score = _compute_experience_score(required_groups, candidate_project_skills, candidate_has_internship)
    ed_score = 100

    # Weighted final: 40% keyword, 30% skills, 20% experience, 10% education
    final_score = round(0.40 * kw_score + 0.30 * sk_score + 0.20 * ex_score + 0.10 * ed_score, 1)

    # Suggestions are strictly JD-derived and only from missing REQUIRED skills.
    if total_required > 0:
        match_ratio = matched_required / total_required
    else:
        match_ratio = 0

    if match_ratio >= 0.95:
        suggestions = [
            "Strengthen your profile with production-level or deployed projects",
            "Highlight measurable impact (e.g., performance improvements, scalability, users)",
        ]
    elif match_ratio >= 0.75:
        suggestions = [
            "Add one strong backend project demonstrating real-world use cases",
            "Gain experience with deployment tools like Docker or cloud platforms",
        ]
    elif match_ratio >= 0.5:
        suggestions = _dedupe_preserve_order([_actionable_suggestion_for_group(s) for s in missing_required_skills[:5]])
    else:
        suggestions = _dedupe_preserve_order([_actionable_suggestion_for_group(s) for s in missing_required_skills[:5]])

    if total_required == 0:
        reasoning = "No explicit required skills were found in the JD text; score is conservative."
    else:
        reasoning = (
            f"Matched {matched_required} out of {total_required} required skill groups. "
            f"Bonus preferred matched: {len(preferred_skills_matched)}."
        )

    return {
        "match_score": float(final_score),
        "matched_skills": matched_required_skills,
        "missing_skills": missing_required_skills,
        "matched_required_skills": matched_required_skills,
        "missing_required_skills": missing_required_skills,
        "preferred_skills_matched": preferred_skills_matched,
        "keyword_analysis": {
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "keyword_score": float(kw_score),
        },
        "resume_fit_analysis": resume_fit_text,
        "breakdown": {
            "keyword_score": float(kw_score),
            "skills_score": float(sk_score),
            "experience_score": float(ex_score),
            "education_score": float(ed_score),
        },
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "suggestions": suggestions,
        "reasoning": reasoning,
    }


def _deterministic_keyword_score(jd_text: str, user_skills: List[str], user_summary: str, resume_text: str = "") -> Optional[int]:
    """Regex-based keyword coverage score used as a sanity check on the LLM score."""
    extracted = _extract_structured_skill_data(jd_text, user_summary, resume_text, user_skills)
    jd_kw = _build_jd_keywords(extracted.get("required_skill_groups", []), extracted.get("preferred_skills", []))
    if not jd_kw:
        return None
    candidate_skills = _normalize_skill_list(user_skills)
    candidate_skill_set = _canonical_skill_set(candidate_skills)
    matched = [kw for kw in jd_kw if kw in candidate_skill_set]
    return round((len(matched) / len(jd_kw)) * 100)


def _fallback_match(user_skills: List[str], user_summary: str, jd_text: str, resume_text: str = "") -> dict:
    """Deterministic keyword fallback when LLM is unavailable."""
    extracted = _extract_structured_skill_data(jd_text, user_summary, resume_text, user_skills)
    required_groups = extracted["required_skill_groups"]
    preferred_skills = extracted["preferred_skills"]
    candidate_skills = extracted["candidate_skills"]
    candidate_project_skills = extracted["candidate_project_skills"]
    candidate_has_internship = extracted["candidate_has_internship"]
    resume_evidence_skills = _resume_evidence_skills(required_groups, resume_text, candidate_project_skills)
    combined_candidate_skills = _dedupe_preserve_order(candidate_skills + resume_evidence_skills)

    (
        matched_required_skills,
        missing_required_skills,
        _matched_required_keywords,
        _missing_required_keywords,
    ) = _compute_group_skill_matches(required_groups, combined_candidate_skills)

    matched_keywords, missing_keywords, keyword_score = _compute_keyword_coverage(required_groups, preferred_skills, combined_candidate_skills)

    matched_required = len(matched_required_skills)
    total_required = len(required_groups)
    kw_score = keyword_score
    sk_score = kw_score
    ex_score = _compute_experience_score(required_groups, candidate_project_skills, candidate_has_internship)
    final_score = round(0.40 * kw_score + 0.30 * sk_score + 0.20 * ex_score + 0.10 * 100, 1)

    if total_required > 0:
        match_ratio = matched_required / total_required
    else:
        match_ratio = 0

    if match_ratio >= 0.95:
        suggestions = [
            "Strengthen your profile with production-level or deployed projects",
            "Highlight measurable impact (e.g., performance improvements, scalability, users)",
        ]
    elif match_ratio >= 0.75:
        suggestions = [
            "Add one strong backend project demonstrating real-world use cases",
            "Gain experience with deployment tools like Docker or cloud platforms",
        ]
    elif match_ratio >= 0.5:
        suggestions = _dedupe_preserve_order([_actionable_suggestion_for_group(skill) for skill in missing_required_skills[:5]])
    else:
        suggestions = _dedupe_preserve_order([_actionable_suggestion_for_group(skill) for skill in missing_required_skills[:5]])

    candidate_all_text = _normalize_match_text((resume_text or "") + " " + " ".join(candidate_skills or []))
    preferred_skills_matched = [skill for skill in preferred_skills if _normalize_match_text(skill) in candidate_all_text]

    resume_fit_payload = _generate_resume_fit_analysis(
        required_groups=required_groups,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        resume_text=resume_text,
    )
    resume_fit_text = resume_fit_payload.get("resume_fit", "")

    return {
        "match_score": final_score,
        "matched_skills": matched_required_skills,
        "missing_skills": missing_required_skills,
        "matched_required_skills": matched_required_skills,
        "missing_required_skills": missing_required_skills,
        "preferred_skills_matched": preferred_skills_matched,
        "keyword_analysis": {
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "keyword_score": float(kw_score),
        },
        "resume_fit_analysis": resume_fit_text,
        "breakdown": {
            "keyword_score": float(kw_score),
            "skills_score": float(sk_score),
            "experience_score": float(ex_score),
            "education_score": 100.0,
        },
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "suggestions": suggestions,
        "reasoning": f"Deterministic fallback: matched {matched_required}/{total_required} required skill groups.",
    }


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
        logger.warning(f"[AI] LLM answer generation failed: {e}")
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
        extracted = _extract_structured_skill_data(jd_text, "", resume_text, [])
        return _build_jd_analysis_output(extracted, jd_text, resume_text)

    except Exception as e:
        logger.warning(f"[AI] LLM JD parse failed, using fallback: {e}")
        extracted = _fallback_structured_extraction(jd_text, "", resume_text, [])
        return _build_jd_analysis_output(extracted, jd_text, resume_text)


def _fallback_jd_parse(jd_text: str) -> dict:
    """Naive keyword-based JD parsing when LLM is unavailable."""
    extracted = _fallback_structured_extraction(jd_text, "", "", [])
    return _build_jd_analysis_output(extracted, jd_text, "")


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

        contact_text = ""
        if profile_data.get("contact_fields"):
            for field in profile_data["contact_fields"]:
                if isinstance(field, dict):
                    label = str(field.get("label", "")).strip()
                    value = str(field.get("value", "")).strip()
                    if label and value:
                        contact_text += f"  - {label}: {value}\n"

        profile_text = f"""Full Name: {profile_data.get('full_name', '')}
Email: {profile_data.get('email', '')}
Phone: {profile_data.get('phone', '')}
LinkedIn: {profile_data.get('linkedin', '')}
GitHub: {profile_data.get('github', '')}
Website: {profile_data.get('website', '')}
Resume Link: {profile_data.get('resume_link', '')}
Additional Contact Fields:
{contact_text}
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
            "6. Use Additional Contact Fields for custom form labels (e.g. alternate phone, portfolio, socials, custom identifiers).\n\n"
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
                    logger.debug(f"[AI] Option snapped: '{ai_value}' → '{snapped}' for field '{f['label']}'")
            elif opts and ftype == "checkbox":
                # Multi-select: validate each comma-separated part
                parts = [p.strip() for p in ai_value.split(",") if p.strip()]
                valid_parts = [_best_option_match(p, opts) for p in parts]
                mapping[fid] = ", ".join(v for v in valid_parts if v)
            else:
                mapping[fid] = ai_value

        return {"field_values": mapping}

    except Exception as e:
        logger.warning(f"[AI] LLM auto-map failed: {e}")
        mapping = {}
        for f in fields:
            mapping[f["field_id"]] = ""
        return {"field_values": mapping}

