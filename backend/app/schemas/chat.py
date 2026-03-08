"""
Chat Schemas - Conversations and Messages
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.chat import SenderRole


# ==========================================
# Message Schemas
# ==========================================

class MessageCreate(BaseModel):
    """Create a new message."""
    message: str = Field(..., min_length=1)
    file_name: Optional[str] = None
    file_bytes: Optional[bytes] = None
    is_urgent: bool = False


class MessageResponse(BaseModel):
    """Message response schema."""
    id: int
    conversation_id: int
    sender_id: int
    sender_role: SenderRole
    message: str
    file_name: str
    file_bytes: bytes
    is_urgent: bool
    is_read: bool   
    created_at: datetime

    class Config:
        from_attributes = True


class MessageWithSender(MessageResponse):
    """Message with sender details."""
    sender_name: str


# ==========================================
# Conversation Schemas
# ==========================================

class ConversationCreate(BaseModel):
    """Create a new conversation."""
    teacher_id: int  # For student initiating
    subject_id: Optional[int] = None


class ConversationResponse(BaseModel):
    """Conversation response schema."""
    id: int
    student_id: int
    teacher_id: int
    subject_id: Optional[int]
    created_at: datetime
    last_message_at: datetime

    class Config:
        from_attributes = True


class ConversationWithParticipant(ConversationResponse):
    """Conversation with participant details."""
    participant_name: str
    participant_email: str
    unread_count: int
    last_message: Optional[str]


class ConversationWithMessages(ConversationResponse):
    """Conversation with all messages."""
    messages: List[MessageResponse]
    participant_name: str
