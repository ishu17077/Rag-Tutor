"""
AI Tutor Router - RAG-based Q&A, PDF Upload, Rate Limiting
"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from pypdf import PdfReader
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.student import StudentProfile, StudentSubject
from app.models.academic import Subject
from app.models.ai import PDFDocument, AIChatSession, AIChatMessage, AIDoubtLog, AIRateLimit, AIRole
from app.models.system import SystemSetting
from app.schemas.ai import AIQueryRequest, AIQueryResponse, AISubjectResponse, RateLimitStatus, ExamModeStatus
from app.utils.security import get_student_user, get_admin_user
from app.utils.file_handler import save_pdf_document, get_full_path
from app.ai.rag_chain import rag_query, extract_topic
from app.ai.vector_store import get_vector_store, reindex_subject
from app.ai.prompts import EXAM_MODE_RESPONSE
from app.services.weak_topic_service import update_weak_topics_from_ai_doubt
from app.utils.pdf_ocr import extract_text_from_scanned_pdf
from app.services.ai_indexing import extract_pdf_chunks, index_pdf_document
from app.models.teacher import ClassNote, ClassAllocation
import json


router = APIRouter(prefix="/api/ai", tags=["AI Tutor"])


# ==========================================
# STUDENT ENDPOINTS
# ==========================================

@router.get("/status", response_model=ExamModeStatus)
async def get_ai_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Check if AI Tutor is available (exam mode check)."""
    exam_mode = db.query(SystemSetting).filter(
        SystemSetting.setting_key == "exam_mode"
    ).first()
    
    is_exam_mode = exam_mode and exam_mode.setting_value.lower() == "true"
    
    return ExamModeStatus(
        exam_mode=is_exam_mode,
        message=EXAM_MODE_RESPONSE if is_exam_mode else "AI Tutor is available"
    )


@router.get("/subjects", response_model=List[AISubjectResponse])
async def get_ai_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get subjects with AI availability (has PDFs indexed)."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get current subjects
    student_subjects = db.query(StudentSubject).filter(
        StudentSubject.student_id == profile.id,
        StudentSubject.is_current == True
    ).all()
    
    subject_ids = [ss.subject_id for ss in student_subjects]
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    
    result = []
    for subject in subjects:
        pdf_count = db.query(PDFDocument).filter(
            PDFDocument.subject_id == subject.id,
            PDFDocument.is_indexed == True,
            PDFDocument.is_active == True
        ).count()
        
        result.append(AISubjectResponse(
            id=subject.id,
            name=subject.name,
            code=subject.code,
            has_pdfs=pdf_count > 0,
            pdf_count=pdf_count
        ))
    
    return result


@router.get("/rate-limit", response_model=RateLimitStatus)
async def get_rate_limit_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get current rate limit status for AI queries."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    rate_limit = db.query(AIRateLimit).filter(
        AIRateLimit.student_id == profile.id
    ).first()
    
    limit_per_minute = settings.AI_RATE_LIMIT_PER_MINUTE
    
    if not rate_limit:
        return RateLimitStatus(
            queries_remaining=limit_per_minute,
            reset_in_seconds=0,
            is_limited=False
        )
    
    # Check if window has expired
    window_duration = timedelta(minutes=1)
    now = datetime.utcnow()
    
    if rate_limit.window_start and (now - rate_limit.window_start) > window_duration:
        # Window expired, reset available
        return RateLimitStatus(
            queries_remaining=limit_per_minute,
            reset_in_seconds=0,
            is_limited=False
        )
    
    remaining = max(0, limit_per_minute - rate_limit.query_count)
    reset_time = rate_limit.window_start + window_duration
    reset_seconds = max(0, int((reset_time - now).total_seconds()))
    
    return RateLimitStatus(
        queries_remaining=remaining,
        reset_in_seconds=reset_seconds,
        is_limited=remaining == 0
    )


@router.post("/chat", response_model=AIQueryResponse)
async def ai_chat(
    request: AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Query AI Tutor with RAG-based response."""
    # Check exam mode
    exam_mode = db.query(SystemSetting).filter(
        SystemSetting.setting_key == "exam_mode"
    ).first()
    
    if exam_mode and exam_mode.setting_value.lower() == "true":
        raise HTTPException(status_code=403, detail=EXAM_MODE_RESPONSE)
    
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Check rate limit
    rate_limit = db.query(AIRateLimit).filter(
        AIRateLimit.student_id == profile.id
    ).first()
    
    now = datetime.utcnow()
    limit_per_minute = settings.AI_RATE_LIMIT_PER_MINUTE
    
    if rate_limit:
        window_duration = timedelta(minutes=1)
        if (now - rate_limit.window_start) > window_duration:
            # Reset window
            rate_limit.query_count = 1
            rate_limit.window_start = now
        else:
            if rate_limit.query_count >= limit_per_minute:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Maximum {limit_per_minute} queries per minute."
                )
            rate_limit.query_count += 1
    else:
        rate_limit = AIRateLimit(
            student_id=profile.id,
            query_count=1,
            window_start=now
        )
        db.add(rate_limit)
    
    # Get subject
    subject = db.query(Subject).filter(Subject.id == request.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get or create session
    if request.session_id:
        session = db.query(AIChatSession).filter(
            AIChatSession.id == request.session_id,
            AIChatSession.student_id == profile.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = AIChatSession(
            student_id=profile.id,
            subject_id=request.subject_id
        )
        db.add(session)
        db.flush()
    
    # Save user message
    user_message = AIChatMessage(
        session_id=session.id,
        role=AIRole.USER,
        content=request.question
    )
    db.add(user_message)
    
    # Run RAG pipeline
    try:
        answer, citations, is_in_scope = await rag_query(
          subject_id=request.subject_id,
            subject_name=subject.name,
            question=request.question,
            file_name=request.file_name,
            file_bytes=request.file_bytes,
        )
    except Exception as e:
        import traceback
        print(f"RAG Query Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")
    
    # Save assistant response
    assistant_message = AIChatMessage(
        session_id=session.id,
        role=AIRole.ASSISTANT,
        content=answer,
        citations=json.dumps(citations) if citations else None
    )
    db.add(assistant_message)
    
    # Log doubt for weak topic detection
    if is_in_scope:
        topic = await extract_topic(request.question)
        if topic:
            doubt_log = AIDoubtLog(
                student_id=profile.id,
                subject_id=request.subject_id,
                topic=topic,
                question=request.question
            )
            db.add(doubt_log)
            
            # Update weak topics
            update_weak_topics_from_ai_doubt(db, profile.id, request.subject_id, topic)
    
    db.commit()
    
    return AIQueryResponse(
        session_id=session.id,
        answer=answer,
        citations=citations,
        is_in_scope=is_in_scope
    )


@router.get("/sessions")
async def get_ai_sessions(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get AI chat sessions for current student."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    query = db.query(AIChatSession).filter(AIChatSession.student_id == profile.id)
    
    if subject_id:
        query = query.filter(AIChatSession.subject_id == subject_id)
    
    sessions = query.order_by(AIChatSession.created_at.desc()).all()
    
    result = []
    for session in sessions:
        message_count = db.query(AIChatMessage).filter(
            AIChatMessage.session_id == session.id
        ).count()
        
        subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
        
        result.append({
            "id": session.id,
            "subject_id": session.subject_id,
            "subject_name": subject.name if subject else "Unknown",
            "created_at": session.created_at,
            "message_count": message_count
        })
    
    return result


@router.get("/sessions/{session_id}")
async def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get messages from an AI chat session."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    session = db.query(AIChatSession).filter(
        AIChatSession.id == session_id,
        AIChatSession.student_id == profile.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
    
    messages = db.query(AIChatMessage).filter(
        AIChatMessage.session_id == session_id
    ).order_by(AIChatMessage.created_at).all()
    
    return {
        "id": session.id,
        "subject_id": session.subject_id,
        "subject_name": subject.name if subject else "Unknown",
        "created_at": session.created_at,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": json.loads(m.citations) if m.citations else [],
                "created_at": m.created_at
            }
            for m in messages
        ]
    }


# ==========================================
# ADMIN/TEACHER ENDPOINTS (PDF Upload)
# ==========================================

@router.post("/subjects/{subject_id}/pdfs")
async def upload_pdf(
    subject_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Upload PDF for RAG indexing.
    File stored on disk, path and metadata in MySQL.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Save to disk
    file_path = await save_pdf_document(file, subject_id)
    full_path = get_full_path(file_path)
    
    # Get file size
    file_size = full_path.stat().st_size
    
    # Create PDF record
    pdf_doc = PDFDocument(
        subject_id=subject_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        uploaded_by=current_user.id,
        is_indexed=False
    )
    db.add(pdf_doc)
    db.commit()
    db.refresh(pdf_doc)
    
    # Index the PDF
    if index_pdf_document(db, pdf_doc):
        return {
            "message": "PDF uploaded and indexed successfully",
            "pdf_id": pdf_doc.id,
            "chunks_indexed": "Indexed"
        }
    else:
        return {
            "message": "PDF uploaded but indexing failed",
            "pdf_id": pdf_doc.id,
            "error": "Indexing failed"
        }


@router.post("/subjects/{subject_id}/reindex")
async def reindex_subject_pdfs(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Re-index all PDFs for a subject."""
    pdfs = db.query(PDFDocument).filter(
        PDFDocument.subject_id == subject_id,
        PDFDocument.is_active == True
    ).all()
    
    if not pdfs:
        raise HTTPException(status_code=404, detail="No PDFs found for this subject")
    
    all_chunks = []
    for pdf in pdfs:
        full_path = get_full_path(pdf.file_path)
        if full_path.exists():
            chunks = extract_pdf_chunks(str(full_path), pdf.file_name)
            all_chunks.extend(chunks)
    
    stats = reindex_subject(subject_id, all_chunks)
    
    # Update indexed status
    for pdf in pdfs:
        pdf.is_indexed = True
        pdf.indexed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Subject PDFs re-indexed successfully",
        **stats
    }


@router.get("/subjects/{subject_id}/pdfs")
async def list_subject_pdfs(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """List all PDFs for a subject."""
    pdfs = db.query(PDFDocument).filter(
        PDFDocument.subject_id == subject_id,
        PDFDocument.is_active == True
    ).all()
    
    return [
        {
            "id": pdf.id,
            "file_name": pdf.file_name,
            "file_size": pdf.file_size,
            "is_indexed": pdf.is_indexed,
            "indexed_at": pdf.indexed_at,
            "created_at": pdf.created_at
        }
        for pdf in pdfs
    ]


@router.post("/sync-class-notes")
async def sync_class_notes(
    db: Session = Depends(get_db)
):
    """
    Sync existing ClassNotes to PDFDocuments for AI indexing.
    Scans for ClassNotes that are PDFs and don't have a corresponding PDFDocument.
    """
    # Get all class notes that are PDFs
    class_notes = db.query(ClassNote).filter(
        ClassNote.file_url.like("%.pdf")
    ).all()
    
    synced_count = 0
    errors = 0
    
    for note in class_notes:
        # Check if already synced (naive check by filename/path or we can check if file_path exists in PDFDocument)
        # Better: check by file_path since it's unique enough (folder/filename)
        
        existing = db.query(PDFDocument).filter(
            PDFDocument.file_path == note.file_url
        ).first()
        
        if existing:
            continue
            
        # Get subject_id and teacher info from allocation
        allocation = db.query(ClassAllocation).filter(
            ClassAllocation.id == note.class_allocation_id
        ).first()
        
        if not allocation:
            continue
            
        # Get teacher's user id
        from app.models.teacher import TeacherProfile
        teacher = db.query(TeacherProfile).filter(TeacherProfile.id == allocation.teacher_id).first()
        uploader_id = teacher.user_id if teacher else 1 # Fallback to admin/system if needed
            
        # Create PDFDocument entry
        # We need the full path to check size
        full_path = get_full_path(note.file_url)
        if not full_path.exists():
            continue
            
        file_size = full_path.stat().st_size
        
        pdf_doc = PDFDocument(
            subject_id=allocation.subject_id,
            file_name=note.title + ".pdf", # Use title as name, assure .pdf
            file_path=note.file_url,
            file_size=file_size,
            uploaded_by=uploader_id, 
            is_indexed=False
        )
        
        db.add(pdf_doc)
        db.commit()
        db.refresh(pdf_doc)
        
        # Index it
        if index_pdf_document(db, pdf_doc):
            synced_count += 1
        else:
            errors += 1
            
    return {
        "message": "Sync completed",
        "synced": synced_count,
        "errors": errors
    }
