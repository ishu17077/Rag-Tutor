"""
RAG Tutor Backend - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.initial_data import init_data
from app.ai.llm import get_bedrock_client

# Import routers
from app.routers import auth, admin, student, teacher, quiz, assignment, chat, ai_tutor


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Starting RAG Tutor Backend...")
    
    # Ensure upload directories exist
    settings.uploads_path.mkdir(parents=True, exist_ok=True)
    settings.faiss_path.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Uploads directory: {settings.uploads_path}")
    print(f"📁 Uploads directory: {settings.uploads_path}")
    print(f"🧠 FAISS indexes directory: {settings.faiss_path}")

    # Initialize DB and seed data
    print("🔧 Initializing database...")
    init_db()
    print("🌱 Seeding initial data...")
    init_data()
    print("Initializing AI Model...")
    get_bedrock_client()
    yield
    
    # Shutdown
    print("👋 Shutting down RAG Tutor Backend...")


# Create FastAPI app
app = FastAPI(
    title="RAG Tutor API",
    description="Academic ERP System with AI-powered tutoring",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","https://13.220.237.124.nip.io", "http://13.220.237.124.nip.io", "https://rag-tutor.click", "http://rag-tutor.click"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#// make sure 304 is not returned which indicates no change instead of actual response
#// StaticFiles.is_not_modified = lambda *args, **kwargs: False

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_path)), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(quiz.router)
app.include_router(assignment.router)
app.include_router(chat.router)
app.include_router(ai_tutor.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "RAG Tutor API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    from app.ai.llm import check_bedrock_health
    from app.config import settings
    
    bedrock_status = check_bedrock_health()
    
    return {
        "status": "healthy",
        "database": "connected",
        "bedrock": "connected" if bedrock_status else "disconnected",
        # "ai_model": settings.INFERENCE_PROFILE_ARN
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
