"""
Cloudflare R2 Storage Service (S3-compatible API via boto3).

Handles upload, download (for PDF text extraction), and deletion of resume files.
Falls back gracefully if R2 is not configured (local dev without credentials).
"""
import logging
import os
import io

logger = logging.getLogger(__name__)


def _clip_text_preserve_ends(text: str, max_chars: int) -> str:
    text = str(text or "").strip()
    if len(text) <= max_chars:
        return text
    if max_chars <= 32:
        return text[:max_chars]

    marker = "\n\n...[middle content omitted for preview]...\n\n"
    head_len = int(max_chars * 0.62)
    tail_len = max_chars - head_len - len(marker)
    if tail_len < 24:
        tail_len = 24
        head_len = max(0, max_chars - tail_len - len(marker))

    return f"{text[:head_len].rstrip()}{marker}{text[-tail_len:].lstrip()}"


def _compose_text_with_links(text: str, links: list[str], max_chars: int) -> str:
    unique_links = [str(link).strip() for link in dict.fromkeys(links or []) if str(link).strip()]
    link_block = "\n".join(unique_links)
    text = str(text or "").strip()

    if not link_block:
        return _clip_text_preserve_ends(text, max_chars)

    suffix = f"\n\nLinks:\n{link_block}" if text else f"Links:\n{link_block}"
    if len(suffix) >= max_chars:
        return suffix[-max_chars:]

    allowed_text_length = max_chars - len(suffix)
    if len(text) > allowed_text_length:
        text = _clip_text_preserve_ends(text, allowed_text_length)
    return (text + suffix).strip()


def _get_client():
    """Build an S3-compatible boto3 client pointed at Cloudflare R2."""
    import boto3
    from botocore.config import Config

    access_key = os.getenv("R2_ACCESS_KEY_ID", "")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY", "")
    endpoint = os.getenv("R2_ENDPOINT", "")
    region = os.getenv("R2_REGION", "auto")

    if not all([access_key, secret_key, endpoint]):
        raise EnvironmentError("[R2] R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT not set in .env")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )


def is_r2_configured() -> bool:
    """Return True if R2 credentials are present in environment."""
    return bool(
        os.getenv("R2_ACCESS_KEY_ID")
        and os.getenv("R2_SECRET_ACCESS_KEY")
        and os.getenv("R2_ENDPOINT")
    )


def upload_file(content: bytes, key: str, content_type: str = "application/pdf") -> str:
    """
    Upload bytes to R2.
    Returns the R2 object key (e.g. 'resumes/abc123_resume.pdf').
    Raises on failure.
    """
    bucket = os.getenv("R2_BUCKET", "job-assist-ai")
    client = _get_client()
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    logger.info(f"[R2] Uploaded: {key} ({len(content)} bytes)")
    return key


def download_file(key: str) -> bytes:
    """
    Download a file from R2 by its object key.
    Returns raw bytes.
    """
    bucket = os.getenv("R2_BUCKET", "job-assist-ai")
    client = _get_client()
    response = client.get_object(Bucket=bucket, Key=key)
    data = response["Body"].read()
    logger.info(f"[R2] Downloaded: {key} ({len(data)} bytes)")
    return data


def delete_file(key: str) -> None:
    """Delete a file from R2 by its object key. Silent if not found."""
    bucket = os.getenv("R2_BUCKET", "job-assist-ai")
    try:
        client = _get_client()
        client.delete_object(Bucket=bucket, Key=key)
        logger.info(f"[R2] Deleted: {key}")
    except Exception as e:
        logger.error(f"[R2] Delete failed for {key}: {e}")


def extract_pdf_text_from_r2(key: str, max_chars: int = 12000) -> str:
    """
    Download a PDF from R2 and extract its text using PyPDF2.
    Returns extracted text (capped at max_chars).
    """
    try:
        pdf_bytes = download_file(key)
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        links = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
            try:
                annotations = page.get("/Annots") or []
                for annotation in annotations:
                    annotation_obj = annotation.get_object()
                    action = annotation_obj.get("/A") if annotation_obj else None
                    uri = action.get("/URI") if action else None
                    if uri:
                        links.append(str(uri))
            except Exception:
                continue
        text = _compose_text_with_links(text, links, max_chars)
        logger.info(f"[R2] PDF text extracted: {len(text)} chars from {key}")
        return text
    except Exception as e:
        logger.error(f"[R2] Failed to extract PDF text from {key}: {e}")
        return ""
