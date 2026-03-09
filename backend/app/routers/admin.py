"""
Admin Router - Degrees, Departments, Semesters, Subjects, User Management
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app.models.user import User, UserRole
from app.models.academic import Degree, Department, Semester, Subject
from app.models.student import StudentProfile
from app.models.teacher import TeacherProfile, TeacherSubject, ClassAllocation
from app.models.system import SystemSetting
from app.schemas.user import UserResponse, UserStatusUpdate
from app.schemas.academic import (
    DegreeCreate, DegreeUpdate, DegreeResponse,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    SemesterCreate, SemesterUpdate, SemesterResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse,
    ClassAllocationCreate, ClassAllocationResponse,
    TeacherSubjectAssign, TeacherSubjectResponse,
    SemesterProgressionRequest
)
from app.utils.security import get_admin_user
from app.services.audit_service import log_action
from datetime import datetime


router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ==========================================
# DEGREE ENDPOINTS
# ==========================================

@router.get("/degrees", response_model=List[DegreeResponse])
async def list_degrees(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all degrees."""
    query = db.query(Degree)
    if not include_inactive:
        query = query.filter(Degree.is_active == True)
    return query.all()


@router.post("/degrees", response_model=DegreeResponse, status_code=201)
async def create_degree(
    request: DegreeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new degree."""
    # Check for duplicate
    if db.query(Degree).filter(Degree.code == request.code).first():
        raise HTTPException(status_code=400, detail="Degree code already exists")
    
    degree = Degree(**request.model_dump())
    db.add(degree)
    
    log_action(db, admin.id, "degree_created", "degrees", None, None, request.model_dump())
    
    db.commit()
    db.refresh(degree)
    return degree


@router.patch("/degrees/{degree_id}", response_model=DegreeResponse)
async def update_degree(
    degree_id: int,
    request: DegreeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update a degree (soft delete via is_active)."""
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")
    
    old_values = {"name": degree.name, "is_active": degree.is_active}
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(degree, key, value)
    
    log_action(db, admin.id, "degree_updated", "degrees", degree_id, old_values, update_data)
    
    db.commit()
    db.refresh(degree)
    return degree


# ==========================================
# DEPARTMENT ENDPOINTS
# ==========================================

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all departments."""
    query = db.query(Department)
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    return query.all()


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(
    request: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new department."""
    if db.query(Department).filter(Department.code == request.code).first():
        raise HTTPException(status_code=400, detail="Department code already exists")
    
    department = Department(**request.model_dump())
    db.add(department)
    
    log_action(db, admin.id, "department_created", "departments", None, None, request.model_dump())
    
    db.commit()
    db.refresh(department)
    return department


@router.patch("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    request: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update a department."""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    old_values = {"name": department.name, "is_active": department.is_active}
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(department, key, value)
    
    log_action(db, admin.id, "department_updated", "departments", department_id, old_values, update_data)
    
    db.commit()
    db.refresh(department)
    return department


# ==========================================
# SEMESTER ENDPOINTS
# ==========================================

@router.get("/semesters", response_model=List[SemesterResponse])
async def list_semesters(
    degree_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List semesters, optionally filtered by degree."""
    query = db.query(Semester)
    if degree_id:
        query = query.filter(Semester.degree_id == degree_id)
    return query.order_by(Semester.degree_id, Semester.number).all()


@router.post("/semesters", response_model=SemesterResponse, status_code=201)
async def create_semester(
    request: SemesterCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new semester for a degree."""
    # Check if semester already exists for this degree
    existing = db.query(Semester).filter(
        and_(Semester.degree_id == request.degree_id, Semester.number == request.number)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Semester already exists for this degree")
    
    semester = Semester(**request.model_dump())
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


# ==========================================
# SUBJECT ENDPOINTS
# ==========================================

@router.get("/subjects", response_model=List[SubjectResponse])
async def list_subjects(
    degree_id: Optional[int] = None,
    department_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List subjects with optional filters."""
    query = db.query(Subject)
    
    if not include_inactive:
        query = query.filter(Subject.is_active == True)
    if degree_id:
        query = query.filter(Subject.degree_id == degree_id)
    if department_id:
        query = query.filter(Subject.department_id == department_id)
    if semester_id:
        query = query.filter(Subject.semester_id == semester_id)
    
    return query.all()


@router.post("/subjects", response_model=SubjectResponse, status_code=201)
async def create_subject(
    request: SubjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new subject."""
    if db.query(Subject).filter(Subject.code == request.code).first():
        raise HTTPException(status_code=400, detail="Subject code already exists")
    
    subject = Subject(**request.model_dump())
    db.add(subject)
    
    log_action(db, admin.id, "subject_created", "subjects", None, None, request.model_dump())
    
    db.commit()
    db.refresh(subject)
    return subject


@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    request: SubjectUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update a subject (soft delete via is_active)."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    old_values = {"name": subject.name, "is_active": subject.is_active}
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(subject, key, value)
    
    action = "subject_deactivated" if update_data.get("is_active") == False else "subject_updated"
    log_action(db, admin.id, action, "subjects", subject_id, old_values, update_data)
    
    db.commit()
    db.refresh(subject)
    return subject


# ==========================================
# TEACHER SUBJECT ASSIGNMENT
# ==========================================

@router.post("/teacher-subjects", response_model=TeacherSubjectResponse, status_code=201)
async def assign_teacher_to_subject(
    request: TeacherSubjectAssign,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Assign a teacher to a subject."""
    # Verify teacher exists
    teacher = db.query(TeacherProfile).filter(TeacherProfile.id == request.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Check if already assigned
    existing = db.query(TeacherSubject).filter(
        and_(
            TeacherSubject.teacher_id == request.teacher_id,
            TeacherSubject.subject_id == request.subject_id,
            TeacherSubject.academic_year == request.academic_year
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Teacher already assigned to this subject")
    
    assignment = TeacherSubject(**request.model_dump())
    db.add(assignment)
    
    log_action(db, admin.id, "teacher_subject_assigned", "teacher_subjects", None, None, request.model_dump())
    
    db.commit()
    db.refresh(assignment)
    return assignment


# ==========================================
# CLASS ALLOCATION
# ==========================================

@router.post("/allocations", response_model=ClassAllocationResponse, status_code=201)
async def create_class_allocation(
    request: ClassAllocationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Allocate a teacher to a class (degree + department + semester + subject)."""
    allocation = ClassAllocation(**request.model_dump())
    db.add(allocation)
    
    log_action(db, admin.id, "teacher_allocated", "class_allocations", None, None, request.model_dump())
    
    db.commit()
    db.refresh(allocation)
    return allocation


@router.get("/allocations", response_model=List[ClassAllocationResponse])
async def list_allocations(
    teacher_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List class allocations with optional filters."""
    query = db.query(ClassAllocation).filter(ClassAllocation.is_active == True)
    
    if teacher_id:
        query = query.filter(ClassAllocation.teacher_id == teacher_id)
    if academic_year:
        query = query.filter(ClassAllocation.academic_year == academic_year)
    
    return query.all()


# ==========================================
# USER MANAGEMENT
# ==========================================

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all users with optional role filter."""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if not include_inactive:
        query = query.filter(User.is_active == True)
    
    return query.all()


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def toggle_user_status(
    user_id: int,
    request: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Activate or deactivate a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own status")
    
    old_status = user.is_active
    user.is_active = request.is_active
    
    action = "user_activated" if request.is_active else "user_deactivated"
    log_action(db, admin.id, action, "users", user_id, {"is_active": old_status}, {"is_active": request.is_active})
    
    db.commit()
    db.refresh(user)
    return user


# ==========================================
# SEMESTER PROGRESSION
# ==========================================

@router.post("/semester-progression")
async def progress_semester(
    request: SemesterProgressionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Advance students to next semester (triggers auto-subject assignment)."""
    # Get all students in the specified semester
    students = db.query(StudentProfile).filter(
        and_(
            StudentProfile.degree_id == request.degree_id,
            StudentProfile.department_id == request.department_id,
            StudentProfile.current_semester_id == request.from_semester_id
        )
    ).all()
    
    if not students:
        raise HTTPException(status_code=404, detail="No students found for progression")
    
    count = 0
    for student in students:
        student.current_semester_id = request.to_semester_id
        count += 1
    
    log_action(
        db, admin.id, "semester_progression", "student_profiles", None,
        {"from_semester": request.from_semester_id},
        {"to_semester": request.to_semester_id, "students_affected": count}
    )
    
    db.commit()
    
    return {"message": f"Successfully progressed {count} students to new semester"}


# ==========================================
# SYSTEM SETTINGS
# ==========================================

@router.get("/settings")
async def get_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all system settings."""
    settings = db.query(SystemSetting).all()
    return {s.setting_key: s.setting_value for s in settings}


@router.patch("/settings")
async def update_settings(
    settings: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update system settings (exam_mode, rate limits, etc.)."""
    for key, value in settings.items():
        setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
        if setting:
            old_value = setting.setting_value
            setting.setting_value = str(value).lower()
            setting.updated_by = admin.id
            
            log_action(
                db, admin.id, "setting_updated", "system_settings", setting.id,
                {"value": old_value}, {"value": str(value).lower()}
            )
    
    db.commit()
    return {"message": "Settings updated successfully"}


# ==========================================
# TEACHER & STUDENT PROFILES WITH IDS
# ==========================================

@router.get("/teachers-full")
async def list_teachers_with_profiles(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all teachers with their full profile information including employee_id."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(TeacherProfile).options(joinedload(TeacherProfile.user), joinedload(TeacherProfile.department))
    
    if not include_inactive:
        query = query.join(User).filter(User.is_active == True)
    
    teachers = query.all()
    
    # Get allocations for all teachers
    from app.models.teacher import ClassAllocation
    
    teacher_allocations = {}
    allocations = db.query(ClassAllocation).options(joinedload(ClassAllocation.subject)).filter(
        ClassAllocation.is_active == True
    ).all()
    
    for alloc in allocations:
        if alloc.teacher_id not in teacher_allocations:
            teacher_allocations[alloc.teacher_id] = []
        teacher_allocations[alloc.teacher_id].append(alloc.subject.name)
    
    return [
        {
            "id": t.user.id,
            "profile_id": t.id,
            "email": t.user.email,
            "full_name": t.user.full_name,
            "phone": t.user.phone,
            "is_active": t.user.is_active,
            "created_at": t.user.created_at,
            "employee_id": t.employee_id,
            "department": t.department.name if t.department else None,
            "designation": t.designation,
            "subjects": teacher_allocations.get(t.id, [])
        }
        for t in teachers
    ]


@router.get("/students-full")
async def list_students_with_profiles(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all students with their full profile information including roll_number."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(StudentProfile).options(
        joinedload(StudentProfile.user),
        joinedload(StudentProfile.degree),
        joinedload(StudentProfile.department)
    )
    
    if not include_inactive:
        query = query.join(User).filter(User.is_active == True)
    
    students = query.all()
    
    return [
        {
            "id": s.user.id,
            "email": s.user.email,
            "full_name": s.user.full_name,
            "phone": s.user.phone,
            "is_active": s.user.is_active,
            "created_at": s.user.created_at,
            "roll_number": s.roll_number,
            "degree": s.degree.name if s.degree else None,
            "department": s.department.name if s.department else None,
            "current_semester": s.current_semester.number if s.current_semester else None
        }
        for s in students
    ]
