"""
AI Schemas - AI Tutor, RAG, Weak Topics
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.ai import AIRole
from app.models.analytics import WeakTopicSource


# ==========================================
# AI Chat Schemas
# ==========================================

class AIQueryRequest(BaseModel):
    """AI tutor query request."""
    subject_id: int
    question: str = Field(..., min_length=1)
    session_id: Optional[int] = None  # Continue existing session


class AIQueryResponse(BaseModel):
    """AI tutor response."""
    session_id: int
    answer: str
    citations: List[str]  # Page/section references
    is_in_scope: bool


class AIChatMessageResponse(BaseModel):
    """AI chat message."""
    id: int
    role: AIRole
    content: str
    citations: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AIChatSessionResponse(BaseModel):
    """AI chat session with messages."""
    id: int
    subject_id: int
    subject_name: str
    created_at: datetime
    messages: List[AIChatMessageResponse]

    class Config:
        from_attributes = True


class AISubjectResponse(BaseModel):
    """Subject with AI availability status."""
    id: int
    name: str
    code: str
    has_pdfs: bool
    pdf_count: int

    class Config:
        from_attributes = True


# ==========================================
# PDF Document Schemas
# ==========================================

class PDFDocumentResponse(BaseModel):
    """PDF document response."""
    id: int
    subject_id: int
    file_name: str
    file_path: str
    file_size: Optional[int]
    is_indexed: bool
    is_active: bool
    indexed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Weak Topic Schemas
# ==========================================

class WeakTopicResponse(BaseModel):
    """Individual weak topic."""
    id: int
    subject_id: int
    subject_name: str
    topic_name: str
    weakness_score: float
    source: WeakTopicSource
    quiz_error_count: int
    ai_doubt_count: int
    last_updated: datetime

    class Config:
        from_attributes = True


class ClassWeakTopicResponse(BaseModel):
    """Class-level weak topic (for teachers)."""
    id: int
    degree_id: int
    department_id: int
    semester_id: int
    subject_id: int
    subject_name: str
    topic_name: str
    affected_students: int
    avg_weakness_score: float
    last_updated: datetime

    class Config:
        from_attributes = True


# ==========================================
# Rate Limit Schemas
# ==========================================

class RateLimitStatus(BaseModel):
    """AI rate limit status."""
    queries_remaining: int
    reset_in_seconds: int
    is_limited: bool


# ==========================================
# Exam Mode Schemas
# ==========================================

class ExamModeStatus(BaseModel):
    """Exam mode status response."""
    exam_mode: bool
    message: str
