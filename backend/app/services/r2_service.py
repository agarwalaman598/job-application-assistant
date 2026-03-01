"""
Cloudflare R2 Storage Service (S3-compatible API via boto3).

Handles upload, download (for PDF text extraction), and deletion of resume files.
Falls back gracefully if R2 is not configured (local dev without credentials).
"""
import logging
import os
import io
import pathlib
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_env_path = pathlib.Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(_env_path)
load_dotenv()


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


def extract_pdf_text_from_r2(key: str, max_chars: int = 3000) -> str:
    """
    Download a PDF from R2 and extract its text using PyPDF2.
    Returns extracted text (capped at max_chars).
    """
    try:
        pdf_bytes = download_file(key)
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        text = text.strip()
        if len(text) > max_chars:
            text = text[:max_chars] + "..."
        logger.info(f"[R2] PDF text extracted: {len(text)} chars from {key}")
        return text
    except Exception as e:
        logger.error(f"[R2] Failed to extract PDF text from {key}: {e}")
        return ""
