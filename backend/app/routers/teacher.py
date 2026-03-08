"""
Teacher Router - Profile, Classes, Dashboard
"""
from typing import List
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.teacher import TeacherProfile, TeacherSubject, ClassAllocation
from app.models.student import StudentProfile
from app.schemas.user import UserResponse, UserUpdate
from app.utils.security import get_teacher_user
from app.utils.file_handler import save_class_note, get_full_path, get_file_size, get_file_extension
from app.services.ai_indexing import index_pdf_document
from app.models.ai import PDFDocument



router = APIRouter(prefix="/api/teacher", tags=["Teacher"])


@router.get("/profile")
async def get_teacher_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get current teacher's full profile."""
    profile = db.query(TeacherProfile).options(
        joinedload(TeacherProfile.department)
    ).filter(TeacherProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return {
        "id": profile.id,
        "user": UserResponse.model_validate(current_user),
        "employee_id": profile.employee_id,
        "department": {
            "id": profile.department.id,
            "name": profile.department.name,
            "code": profile.department.code
        },
        "designation": profile.designation,
        "joining_date": profile.joining_date
    }


@router.patch("/profile")
async def update_teacher_profile(
    request: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Update teacher's basic profile info."""
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.commit()
    
    return {"message": "Profile updated successfully"}


@router.get("/subjects")
async def get_teacher_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get subjects assigned to teacher."""
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    # 1. Direct assignments
    teacher_subjects = db.query(TeacherSubject).options(
        joinedload(TeacherSubject.subject)
    ).filter(
        TeacherSubject.teacher_id == profile.id,
        TeacherSubject.is_active == True
    ).all()
    
    # 2. Subjects from allocated classes
    class_allocations = db.query(ClassAllocation).options(
        joinedload(ClassAllocation.subject)
    ).filter(
        ClassAllocation.teacher_id == profile.id,
        ClassAllocation.is_active == True
    ).all()
    
    # Merge unique subjects
    start_subjects = {} # Map subject_id -> dict
    
    for ts in teacher_subjects:
        if ts.subject.id not in start_subjects:
            start_subjects[ts.subject.id] = {
                "id": ts.subject.id,
                "name": ts.subject.name,
                "code": ts.subject.code,
                "credits": ts.subject.credits,
                "academic_year": ts.academic_year
            }
            
    for ca in class_allocations:
        if ca.subject.id not in start_subjects:
            start_subjects[ca.subject.id] = {
                "id": ca.subject.id,
                "name": ca.subject.name,
                "code": ca.subject.code,
                "credits": ca.subject.credits,
                "academic_year": ca.academic_year
            }
            
    return list(start_subjects.values())


@router.get("/classes")
async def get_teacher_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get classes allocated to teacher."""
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    allocations = db.query(ClassAllocation).options(
        joinedload(ClassAllocation.degree),
        joinedload(ClassAllocation.department),
        joinedload(ClassAllocation.semester),
        joinedload(ClassAllocation.subject)
    ).filter(
        ClassAllocation.teacher_id == profile.id,
        ClassAllocation.is_active == True
    ).all()
    
    classes = []
    for alloc in allocations:
        # Count students in this class
        student_count = db.query(StudentProfile).filter(
            StudentProfile.degree_id == alloc.degree_id,
            StudentProfile.department_id == alloc.department_id,
            StudentProfile.current_semester_id == alloc.semester_id
        ).count()
        
        classes.append({
            "id": alloc.id,
            "degree": {"id": alloc.degree.id, "name": alloc.degree.name, "code": alloc.degree.code},
            "department": {"id": alloc.department.id, "name": alloc.department.name, "code": alloc.department.code},
            "semester": {"id": alloc.semester.id, "number": alloc.semester.number},
            "subject": {"id": alloc.subject.id, "name": alloc.subject.name, "code": alloc.subject.code},
            "academic_year": alloc.academic_year,
            "student_count": student_count
        })
    
    return classes


@router.get("/classes/{allocation_id}/students")
async def get_class_students(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get students in a specific allocated class."""
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.id == allocation_id,
        ClassAllocation.teacher_id == profile.id
    ).first()
    
    if not allocation:
        raise HTTPException(status_code=404, detail="Class allocation not found")
    
    students = db.query(StudentProfile).options(
        joinedload(StudentProfile.user)
    ).filter(
        StudentProfile.degree_id == allocation.degree_id,
        StudentProfile.department_id == allocation.department_id,
        StudentProfile.current_semester_id == allocation.semester_id
    ).all()
    
    return [
        {
            "id": s.id,
            "name": s.user.full_name,
            "email": s.user.email,
            "roll_number": s.roll_number
        }
        for s in students if s.user.is_active
    ]


@router.get("/dashboard")
async def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get teacher dashboard overview."""
    from app.models.quiz import Quiz
    from app.models.assignment import Assignment, AssignmentSubmission
    from app.models.chat import ChatMessage, ChatConversation
    
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    # Count allocated classes
    class_count = db.query(ClassAllocation).filter(
        ClassAllocation.teacher_id == profile.id,
        ClassAllocation.is_active == True
    ).count()
    
    # Count active quizzes
    quiz_count = db.query(Quiz).filter(
        Quiz.teacher_id == profile.id,
        Quiz.is_active == True
    ).count()
    
    # Count active assignments
    assignment_count = db.query(Assignment).filter(
        Assignment.teacher_id == profile.id,
        Assignment.is_active == True
    ).count()
    
    # Count pending submissions to grade
    teacher_assignments = db.query(Assignment.id).filter(
        Assignment.teacher_id == profile.id
    ).all()
    assignment_ids = [a.id for a in teacher_assignments]
    
    pending_grading = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id.in_(assignment_ids),
        AssignmentSubmission.status == "submitted"
    ).count() if assignment_ids else 0
    
    # Count unread messages
    conversation_ids = [c.id for c in db.query(ChatConversation).filter(
        ChatConversation.teacher_id == profile.id
    ).all()]
    
    unread_messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id.in_(conversation_ids),
        ChatMessage.sender_role == "student",
        ChatMessage.is_read == False
    ).count() if conversation_ids else 0
    
    return {
        "teacher_name": current_user.full_name,
        "employee_id": profile.employee_id,
        "department": profile.department.name,
        "allocated_classes": class_count,
        "active_quizzes": quiz_count,
        "active_assignments": assignment_count,
        "pending_grading": pending_grading,
        "unread_messages": unread_messages
    }


@router.post("/classes/{allocation_id}/notes")
async def upload_class_note(
    allocation_id: int,
    title: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Upload a note/resource for a class."""
    from app.models.teacher import ClassNote
    
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
 
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.id == allocation_id,
        ClassAllocation.teacher_id == profile.id
    ).first()

    if not allocation:
        raise HTTPException(status_code=404, detail="Class allocation not found")
    
    file_path = await save_class_note(file, allocation_id)
    
    note = ClassNote(
        class_allocation_id=allocation_id,
        title=title,
        file_url=file_path
    )
    db.add(note)
    db.add(note)
    db.commit()
    
    # Check if it's a PDF and index for AI Tutor
    try:
        if get_file_extension(file.filename) == ".pdf":
            file_size = get_file_size(file_path)
            
            pdf_doc = PDFDocument(
                subject_id=allocation.subject_id,
                file_name=title + ".pdf",
                file_path=file_path,
                file_size=file_size or 0,
                uploaded_by=current_user.id,
                is_indexed=False
            )
            
            db.add(pdf_doc)
            db.commit()
            db.refresh(pdf_doc)
            
            # Trigger indexing (background or async would be better, but sync for now)
            index_pdf_document(db, pdf_doc)
            
    except Exception as e:
        print(f"Auto-indexing failed for note {note.id}: {e}")
        # Don't fail the upload just because indexing failed
    
    return {"message": "Note uploaded successfully", "note_id": note.id}


@router.get("/classes/{allocation_id}/notes")
async def get_class_notes(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get all notes for a class."""
    from app.models.teacher import ClassNote
    
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.id == allocation_id,
        ClassAllocation.teacher_id == profile.id
    ).first()
    
    if not allocation:
        raise HTTPException(status_code=404, detail="Class allocation not found")
    
    notes = db.query(ClassNote).filter(
        ClassNote.class_allocation_id == allocation_id
    ).order_by(ClassNote.uploaded_at.desc()).all()
    
    return [
        {
            "id": n.id,
            "title": n.title,
            "file_url": n.file_url,
            "uploaded_at": n.uploaded_at
        }
        for n in notes
    ]


@router.get("/classes/{allocation_id}/pdfs")
async def get_class_pdfs(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Get AI study material PDFs for a class."""
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.id == allocation_id,
        ClassAllocation.teacher_id == profile.id
    ).first()
    
    if not allocation:
        raise HTTPException(status_code=404, detail="Class allocation not found")
    
    pdfs = db.query(PDFDocument).filter(
        PDFDocument.subject_id == allocation.subject_id,
        PDFDocument.is_active == True
    ).order_by(PDFDocument.created_at.desc()).all()
    
    return [
        {
            "id": p.id,
            "file_name": p.file_name,
            "file_size": p.file_size,
            "is_indexed": p.is_indexed,
            "indexed_at": p.indexed_at,
            "created_at": p.created_at
        }
        for p in pdfs
    ]


@router.post("/classes/{allocation_id}/pdfs")
async def upload_class_pdf(
    allocation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Upload a PDF for AI study materials (RAG indexing)."""
    from app.utils.file_handler import save_pdf_document
    
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.id == allocation_id,
        ClassAllocation.teacher_id == profile.id
    ).first()
    
    if not allocation:
        raise HTTPException(status_code=404, detail="Class allocation not found")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed for AI study materials")
    
    # Save PDF to disk
    file_path = await save_pdf_document(file, allocation.subject_id)
    full_path = get_full_path(file_path)
    file_size = full_path.stat().st_size
    
    # Create PDF record
    pdf_doc = PDFDocument(
        subject_id=allocation.subject_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        uploaded_by=current_user.id,
        is_indexed=False
    )
    db.add(pdf_doc)
    db.commit()
    db.refresh(pdf_doc)
    
    # Index the PDF for AI
    indexed = index_pdf_document(db, pdf_doc)
    
    return {
        "message": "PDF uploaded and indexed successfully" if indexed else "PDF uploaded but indexing failed",
        "pdf_id": pdf_doc.id,
        "is_indexed": pdf_doc.is_indexed
    }


@router.delete("/classes/{allocation_id}/pdfs/{pdf_id}")
async def delete_class_pdf(
    allocation_id: int,
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """Delete an AI study material PDF."""
    from app.utils.file_handler import delete_file
    from app.ai.vector_store import reindex_subject
    
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.id == allocation_id,
        ClassAllocation.teacher_id == profile.id
    ).first()
    
    if not allocation:
        raise HTTPException(status_code=404, detail="Class allocation not found")
    
    pdf_doc = db.query(PDFDocument).filter(
        PDFDocument.id == pdf_id,
        PDFDocument.subject_id == allocation.subject_id
    ).first()
    
    if not pdf_doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Soft delete
    pdf_doc.is_active = False
    db.commit()
    
    # Re-index remaining active PDFs for this subject
    try:
        from app.services.ai_indexing import extract_pdf_chunks
        
        remaining_pdfs = db.query(PDFDocument).filter(
            PDFDocument.subject_id == allocation.subject_id,
            PDFDocument.is_active == True,
            PDFDocument.is_indexed == True
        ).all()
        
        all_chunks = []
        for pdf in remaining_pdfs:
            full_path = get_full_path(pdf.file_path)
            if full_path.exists():
                chunks = extract_pdf_chunks(str(full_path), pdf.file_name)
                all_chunks.extend(chunks)
        
        reindex_subject(allocation.subject_id, all_chunks)
    except Exception as e:
        print(f"Re-indexing failed after PDF deletion: {e}")
    
    return {"message": "PDF deleted successfully"}
