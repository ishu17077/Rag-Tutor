"""
AI Models - PDFs, Chat Sessions, Rate Limiting
Files stored on disk, paths in MySQL.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AIRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class PDFDocument(Base):
    """PDF documents for RAG - files on disk, paths in MySQL."""
    __tablename__ = "pdf_documents"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Disk path
    file_size = Column(Integer, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_indexed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # Soft delete
    indexed_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    subject = relationship("Subject", back_populates="pdf_documents")
    
    def __repr__(self):
        return f"<PDFDocument(id={self.id}, file_name={self.file_name})>"


class AIChatSession(Base):
    """AI tutor chat session for a subject."""
    __tablename__ = "ai_chat_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    student = relationship("StudentProfile", back_populates="ai_chat_sessions")
    subject = relationship("Subject", back_populates="ai_chat_sessions")
    messages = relationship("AIChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AIChatSession(id={self.id}, student_id={self.student_id})>"


class AIChatMessage(Base):
    """Individual AI chat messages."""
    __tablename__ = "ai_chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(AIRole, name="ai_chat_role",values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)  # JSON array of page references
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    session = relationship("AIChatSession", back_populates="messages")
    
    def __repr__(self):
        return f"<AIChatMessage(id={self.id}, role={self.role})>"


class AIDoubtLog(Base):
    """AI doubts tracking for weak topic detection."""
    __tablename__ = "ai_doubt_log"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    topic = Column(String(255), nullable=True)
    question = Column(Text, nullable=False)
    asked_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    student = relationship("StudentProfile", back_populates="ai_doubt_logs")
    subject = relationship("Subject", back_populates="ai_doubt_logs")
    
    def __repr__(self):
        return f"<AIDoubtLog(id={self.id}, student_id={self.student_id})>"


class AIRateLimit(Base):
    """AI rate limiting per student."""
    __tablename__ = "ai_rate_limits"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    query_count = Column(Integer, default=0)
    window_start = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    student = relationship("StudentProfile", back_populates="ai_rate_limit")
    
    def __repr__(self):
        return f"<AIRateLimit(student_id={self.student_id}, count={self.query_count})>"
