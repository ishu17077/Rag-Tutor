"""
Analytics Models - Weak Topics for Students and Classes
"""
from sqlalchemy import Column, Integer, String, DECIMAL, Enum, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class WeakTopicSource(str, enum.Enum):
    QUIZ = "QUIZ"
    AI_DOUBTS = "AI_DOUBTS"
    COMBINED = "COMBINED"


class WeakTopic(Base):
    """Individual student's weak topics."""
    __tablename__ = "weak_topics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    topic_name = Column(String(255), nullable=False)
    weakness_score = Column(DECIMAL(5, 2), default=0)  # 0-100 scale
    source = Column(Enum(WeakTopicSource, name="weak_source", values_callable=lambda obj: [e.value.lower() for e in obj]), nullable=False)
    quiz_error_count = Column(Integer, default=0)
    ai_doubt_count = Column(Integer, default=0)
    last_updated = Column(
        TIMESTAMP, 
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    )
    
    # Relationships
    student = relationship("StudentProfile", back_populates="weak_topics")
    subject = relationship("Subject", back_populates="weak_topics")
    
    def __repr__(self):
        return f"<WeakTopic(student_id={self.student_id}, topic={self.topic_name})>"


class ClassWeakTopic(Base):
    """Aggregated weak topics for a class (for teachers)."""
    __tablename__ = "class_weak_topics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    degree_id = Column(Integer, ForeignKey("degrees.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    topic_name = Column(String(255), nullable=False)
    affected_students = Column(Integer, default=0)
    avg_weakness_score = Column(DECIMAL(5, 2), default=0)
    last_updated = Column(
        TIMESTAMP, 
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    )
    
    # Relationships
    degree = relationship("Degree")
    department = relationship("Department")
    semester = relationship("Semester")
    subject = relationship("Subject", back_populates="class_weak_topics")
    
    def __repr__(self):
        return f"<ClassWeakTopic(subject_id={self.subject_id}, topic={self.topic_name})>"
