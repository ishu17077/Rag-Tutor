"""
Initial data seeding for RAG Tutor Backend.
Creates default admin user if not exists.
"""
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.security import hash_password, verify_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_data():
    """Seed initial data."""
    db = SessionLocal()
    try:
        check_and_create_admin(db)
    finally:
        db.close()

def check_and_create_admin(db: Session):
    """Check if admin exists, create if not."""
    admin_email = "admin@college.edu"
    admin_password = "Admin@123"
    
    user = db.query(User).filter(User.email == admin_email).first()
    if not user:
        logger.info(f"Creating default admin user: {admin_email}")
        user = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            full_name="System Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(user)
        db.commit()
        logger.info("Admin user created successfully.")
    # else:
    #     # Force reset password to ensure defaults work
    #     logger.info(f"Admin user exists. Resetting password to default.")
    #     user.password_hash = hash_password(admin_password)
    #     db.commit()
    #     # Verify immediately
    #     if verify_password(admin_password, user.password_hash):
    #          logger.info("SELF-VERIFICATION: Password hash valid.")
    #     else:
    #          logger.error("SELF-VERIFICATION: Password hash INVALID immediately after set!")
    #     logger.info("Admin password reset successfully.")

if __name__ == "__main__":
    init_data()
