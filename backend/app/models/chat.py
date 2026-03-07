"""
Chat Models - Student-Teacher Conversations and Messages
"""
from sqlalchemy import Column, Integer, Text, Boolean, Enum, ForeignKey, TIMESTAMP, String, text
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SenderRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"


class ChatConversation(Base):
    """One-to-one conversation between student and teacher."""
    __tablename__ = "chat_conversations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teacher_profiles.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    last_message_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    student = relationship("StudentProfile", back_populates="chat_conversations")
    teacher = relationship("TeacherProfile", back_populates="chat_conversations")
    subject = relationship("Subject", back_populates="chat_conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ChatConversation(id={self.id}, student_id={self.student_id}, teacher_id={self.teacher_id})>"


class ChatMessage(Base):
    """Individual chat messages."""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_role = Column(Enum(SenderRole, values_callable=lambda x: [e.value for e in x]), nullable=False)
    message = Column(Text, nullable=False)
    file_path = Column(String(500), nullable=True)
    is_urgent = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"), index=True)
    
    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, conversation_id={self.conversation_id})>"
