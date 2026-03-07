"""
File Handler Utilities - Upload, Storage, PDF Processing
Files stored on disk, paths in MySQL.
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from app.config import settings


# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx"}
ALLOWED_ASSIGNMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".zip", ".rar", ".txt"}
ALLOWED_NOTE_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".jpg", ".png"}


def get_file_extension(filename: str) -> str:
    """Get lowercase file extension."""
    return Path(filename).suffix.lower()


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving the extension."""
    ext = get_file_extension(original_filename)
    unique_id = uuid.uuid4().hex[:12]
    return f"{unique_id}{ext}"


async def save_upload_file(
    file: UploadFile,
    subdirectory: str,
    allowed_extensions: set,
    max_size_mb: int = 10
) -> str:
    """
    Save an uploaded file to disk and return the relative path.
    Files stored on disk, paths returned for MySQL storage.
    """
    # Validate extension
    ext = get_file_extension(file.filename)
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {allowed_extensions}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size_mb}MB"
        )
    
    # Create directory if not exists
    upload_dir = settings.uploads_path / subdirectory
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename)
    file_path = upload_dir / unique_filename
    
    # Save file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return relative path for MySQL storage
    return f"{subdirectory}/{unique_filename}"


async def save_profile_picture(file: UploadFile, user_id: int) -> str:
    """Save a profile picture and return the path."""
    return await save_upload_file(
        file,
        subdirectory=f"profiles/{user_id}",
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        max_size_mb=5
    )


async def save_pdf_document(file: UploadFile, subject_id: int) -> str:
    """Save a PDF document for RAG and return the path."""
    if get_file_extension(file.filename) != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    return await save_upload_file(
        file,
        subdirectory=f"pdfs/subject_{subject_id}",
        allowed_extensions={".pdf"},
        max_size_mb=50
    )


async def save_assignment_attachment(file: UploadFile, assignment_id: int) -> str:
    """Save an assignment attachment."""
    return await save_upload_file(
        file,
        subdirectory=f"assignments/{assignment_id}",
        allowed_extensions=ALLOWED_ASSIGNMENT_EXTENSIONS,
        max_size_mb=20
    )


async def save_assignment_submission(file: UploadFile, assignment_id: int, student_id: int) -> str:
    """Save a student's assignment submission."""
    return await save_upload_file(
        file,
        subdirectory=f"submissions/{assignment_id}/{student_id}",
        max_size_mb=20
    )


async def save_class_note(file: UploadFile, allocation_id: int) -> str:
    """Save a class note."""
    return await save_upload_file(
        file,
        subdirectory=f"class_notes/{allocation_id}",
        allowed_extensions=ALLOWED_NOTE_EXTENSIONS,
        max_size_mb=50
    )


async def save_chat_file(file: UploadFile) -> str:
    return await save_upload_file(
        file,
        subdirectory=f"chat_uploads",
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        max_size_mb=10,
    )


def get_full_path(relative_path: str) -> Path:
    """Get the full disk path from a relative path."""
    return settings.uploads_path / relative_path


def delete_file(relative_path: str) -> bool:
    """Delete a file from disk. Returns True if deleted, False if not found."""
    full_path = get_full_path(relative_path)
    if full_path.exists():
        full_path.unlink()
        return True
    return False


def get_file_size(relative_path: str) -> Optional[int]:
    """Get file size in bytes."""
    full_path = get_full_path(relative_path)
    if full_path.exists():
        return full_path.stat().st_size
    return None
