"""
Chat Router - Student-Teacher Messaging
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.teacher import TeacherProfile
from app.models.chat import ChatConversation, ChatMessage, SenderRole
from app.schemas.chat import ConversationCreate, MessageCreate, MessageResponse
from app.utils.security import get_current_user, get_student_user, get_teacher_user


router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ==========================================
# CONVERSATION MANAGEMENT
# ==========================================

@router.get("/conversations")
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all conversations for current user."""
    if current_user.role == UserRole.STUDENT:
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        conversations = db.query(ChatConversation).options(
            joinedload(ChatConversation.teacher).joinedload(TeacherProfile.user)
        ).filter(ChatConversation.student_id == profile.id).all()
        
        result = []
        for conv in conversations:
            unread = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.sender_role == SenderRole.TEACHER,
                ChatMessage.is_read == False
            ).count()
            
            last_msg = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conv.id
            ).order_by(ChatMessage.created_at.desc()).first()
            
            result.append({
                "id": conv.id,
                "participant_name": conv.teacher.user.full_name,
                "participant_email": conv.teacher.user.email,
                "last_message": last_msg.message[:50] if last_msg else None,
                "last_message_at": conv.last_message_at,
                "unread_count": unread
            })
        
        return result
    
    elif current_user.role == UserRole.TEACHER:
        profile = db.query(TeacherProfile).filter(
            TeacherProfile.user_id == current_user.id
        ).first()
        conversations = db.query(ChatConversation).options(
            joinedload(ChatConversation.student).joinedload(StudentProfile.user)
        ).filter(ChatConversation.teacher_id == profile.id).all()
        
        result = []
        for conv in conversations:
            unread = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.sender_role == SenderRole.STUDENT,
                ChatMessage.is_read == False
            ).count()
            
            last_msg = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conv.id
            ).order_by(ChatMessage.created_at.desc()).first()
            
            # Check if any unread message is urgent
            has_urgent = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.is_urgent == True,
                ChatMessage.is_read == False
            ).count() > 0
            
            result.append({
                "id": conv.id,
                "participant_name": conv.student.user.full_name,
                "participant_email": conv.student.user.email,
                "participant_roll": conv.student.roll_number,
                "last_message": last_msg.message[:50] if last_msg else None,
                "last_message_at": conv.last_message_at,
                "unread_count": unread,
                "has_urgent": has_urgent
            })
        
        return result
    
    return []


@router.post("/conversations")
async def create_conversation(
    request: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Create a new conversation (student initiates)."""
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    # Check if conversation already exists
    existing = db.query(ChatConversation).filter(
        ChatConversation.student_id == student_profile.id,
        ChatConversation.teacher_id == request.teacher_id
    ).first()
    
    if existing:
        return {"id": existing.id, "message": "Conversation already exists"}
    
    conversation = ChatConversation(
        student_id=student_profile.id,
        teacher_id=request.teacher_id,
        subject_id=request.subject_id
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return {"id": conversation.id, "message": "Conversation created"}


# ==========================================
# MESSAGES
# ==========================================

@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all messages in a conversation."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify access
    if current_user.role == UserRole.STUDENT:
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        if conversation.student_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.TEACHER:
        profile = db.query(TeacherProfile).filter(
            TeacherProfile.user_id == current_user.id
        ).first()
        if conversation.teacher_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Mark messages as read
    sender_role = SenderRole.TEACHER if current_user.role == UserRole.STUDENT else SenderRole.STUDENT
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.sender_role == sender_role,
        ChatMessage.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at).all()
    
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "message": m.message,
            "file_path": m.file_path,
            "is_urgent": m.is_urgent,
            "is_read": m.is_read,
            "created_at": m.created_at
        }
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    request: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message in a conversation."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Determine sender role
    if current_user.role == UserRole.STUDENT:
        sender_role = SenderRole.STUDENT
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        if conversation.student_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        sender_role = SenderRole.TEACHER
        profile = db.query(TeacherProfile).filter(
            TeacherProfile.user_id == current_user.id
        ).first()
        if conversation.teacher_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_role=sender_role,
        message=request.message,
        is_urgent=request.is_urgent
    )
    db.add(message)
    
    # Update last message timestamp
    conversation.last_message_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    return {
        "id": message.id,
        "message": message.message,
        "is_urgent": message.is_urgent,
        "created_at": message.created_at
    }


# ==========================================
# WEBSOCKET FOR REAL-TIME CHAT
# ==========================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}
    
    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = {}
        self.active_connections[conversation_id][user_id] = websocket
    
    def disconnect(self, conversation_id: int, user_id: int):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].pop(user_id, None)
    
    async def broadcast(self, conversation_id: int, message: dict, sender_id: int):
        if conversation_id in self.active_connections:
            for user_id, connection in self.active_connections[conversation_id].items():
                if user_id != sender_id:
                    await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time chat."""
    from app.utils.security import decode_token
    
    try:
        # Authenticate
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        await manager.connect(websocket, conversation_id, user_id)
        
        try:
            while True:
                data = await websocket.receive_json()
                
                # Broadcast to other participants
                await manager.broadcast(conversation_id, {
                    "type": "message",
                    "sender_id": user_id,
                    "content": data.get("message"),
                    "is_urgent": data.get("is_urgent", False),
                    "timestamp": datetime.utcnow().isoformat()
                }, user_id)
        
        except WebSocketDisconnect:
            manager.disconnect(conversation_id, user_id)
    
    except Exception as e:
        await websocket.close(code=4001)
