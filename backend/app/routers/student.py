"""
Student Router - Profile, Subjects, Dashboard
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.student import StudentProfile, StudentSubject
from app.models.academic import Subject, Degree, Department, Semester
from app.models.teacher import TeacherSubject, ClassAllocation, ClassNote
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.academic import SubjectWithDetails
from app.utils.security import get_student_user
from app.services.weak_topic_service import get_student_weak_topics


router = APIRouter(prefix="/api/student", tags=["Student"])


@router.get("/profile")
async def get_student_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get current student's full profile."""
    profile = db.query(StudentProfile).options(
        joinedload(StudentProfile.degree),
        joinedload(StudentProfile.department),
        joinedload(StudentProfile.current_semester)
    ).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    return {
        "id": profile.id,
        "user": UserResponse.model_validate(current_user),
        "roll_number": profile.roll_number,
        "degree": {
            "id": profile.degree.id,
            "name": profile.degree.name,
            "code": profile.degree.code
        },
        "department": {
            "id": profile.department.id,
            "name": profile.department.name,
            "code": profile.department.code
        },
        "current_semester": {
            "id": profile.current_semester.id,
            "number": profile.current_semester.number
        },
        "passout_year": profile.passout_year,
        "admission_year": profile.admission_year
    }


@router.patch("/profile")
async def update_student_profile(
    request: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Update student's basic profile info."""
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile updated successfully"}


@router.get("/subjects")
async def get_student_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get current semester subjects with teacher info."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get current subjects
    student_subjects = db.query(StudentSubject).options(
        joinedload(StudentSubject.subject)
    ).filter(
        StudentSubject.student_id == profile.id,
        StudentSubject.is_current == True
    ).all()
    
    subjects_with_teachers = []
    for ss in student_subjects:
        subject = ss.subject
        
        # Find teacher allocated to this class
        allocation = db.query(ClassAllocation).filter(
            ClassAllocation.subject_id == subject.id,
            ClassAllocation.degree_id == profile.degree_id,
            ClassAllocation.department_id == profile.department_id,
            ClassAllocation.semester_id == profile.current_semester_id,
            ClassAllocation.is_active == True
        ).first()
        
        teacher_info = None
        if allocation:
            teacher_user = allocation.teacher.user
            teacher_info = {
                "id": allocation.teacher.id,
                "name": teacher_user.full_name,
                "email": teacher_user.email
            }
        
        subjects_with_teachers.append({
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "credits": subject.credits,
            "teacher": teacher_info
        })
    
    return {
        "semester_number": profile.current_semester.number,
        "subjects": subjects_with_teachers
    }


@router.get("/dashboard")
async def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get student dashboard overview."""
    from app.models.quiz import Quiz, QuizAttempt
    from app.models.assignment import Assignment, AssignmentSubmission
    from app.models.chat import ChatMessage
    from sqlalchemy import func
    
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get subject IDs for current semester
    subject_ids = [ss.subject_id for ss in db.query(StudentSubject).filter(
        StudentSubject.student_id == profile.id,
        StudentSubject.is_current == True
    ).all()]
    
    # Count pending quizzes
    attempted_quiz_ids = [a.quiz_id for a in db.query(QuizAttempt).filter(
        QuizAttempt.student_id == profile.id
    ).all()]
    
    pending_quizzes = db.query(Quiz).filter(
        Quiz.subject_id.in_(subject_ids),
        Quiz.is_active == True,
        ~Quiz.id.in_(attempted_quiz_ids) if attempted_quiz_ids else True
    ).count()
    
    # Count pending assignments
    submitted_assignment_ids = [s.assignment_id for s in db.query(AssignmentSubmission).filter(
        AssignmentSubmission.student_id == profile.id
    ).all()]
    
    pending_assignments = db.query(Assignment).filter(
        Assignment.subject_id.in_(subject_ids),
        Assignment.is_active == True,
        ~Assignment.id.in_(submitted_assignment_ids) if submitted_assignment_ids else True
    ).count()
    
    # Count unread messages
    from app.models.chat import ChatConversation
    conversation_ids = [c.id for c in db.query(ChatConversation).filter(
        ChatConversation.student_id == profile.id
    ).all()]
    
    unread_messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id.in_(conversation_ids),
        ChatMessage.sender_role == "teacher",
        ChatMessage.is_read == False
    ).count() if conversation_ids else 0
    
    return {
        "student_name": current_user.full_name,
        "roll_number": profile.roll_number,
        "semester": profile.current_semester.number,
        "subject_count": len(subject_ids),
        "pending_quizzes": pending_quizzes,
        "pending_assignments": pending_assignments,
        "pending_assignments": pending_assignments,
        "unread_messages": unread_messages
    }


@router.get("/weak-topics")
async def get_weak_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get the current student's weak topics ordered by weakness score."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    weak_topics = get_student_weak_topics(db, profile.id)

    return [
        {
            "id": wt.id,
            "topic_name": wt.topic_name,
            "subject_id": wt.subject_id,
            "weakness_score": wt.weakness_score,
            "source": wt.source.value if wt.source else None,
            "quiz_error_count": wt.quiz_error_count,
            "ai_doubt_count": wt.ai_doubt_count,
            "last_updated": wt.last_updated if hasattr(wt, "last_updated") else None,
        }
        for wt in weak_topics
    ]


@router.get("/subjects/{subject_id}/notes")
async def get_subject_notes(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get notes for a specific subject."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Find the class allocation for this subject and student's batch
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.subject_id == subject_id,
        ClassAllocation.degree_id == profile.degree_id,
        ClassAllocation.department_id == profile.department_id,
        ClassAllocation.semester_id == profile.current_semester_id,
        ClassAllocation.is_active == True
    ).first()
    
    if not allocation:
        # It's possible the subject is assigned but no specific class allocation exists yet
        # or it's a generic subject. But for notes, we need an allocation.
        return []

    notes = db.query(ClassNote).filter(
        ClassNote.class_allocation_id == allocation.id
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


@router.get("/subjects/{subject_id}")
async def get_student_subject_detail(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """Get details for a specific subject."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    # Find teacher allocated to this class
    allocation = db.query(ClassAllocation).filter(
        ClassAllocation.subject_id == subject.id,
        ClassAllocation.degree_id == profile.degree_id,
        ClassAllocation.department_id == profile.department_id,
        ClassAllocation.semester_id == profile.current_semester_id,
        ClassAllocation.is_active == True
    ).first()
    
    teacher_info = None
    if allocation:
        teacher_user = allocation.teacher.user
        teacher_info = {
            "id": allocation.teacher.id,
            "name": teacher_user.full_name,
            "email": teacher_user.email
        }
    
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "credits": subject.credits,
        "teacher": teacher_info
    }

