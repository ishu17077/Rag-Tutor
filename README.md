# RAG Tutor - Academic ERP System
[Access Project](https://rag-tutor.click)


A comprehensive academic web application with Admin, Student, and Teacher roles, featuring AI-powered tutoring with local LLMs.

## 🎯 Features

### 👤 User Roles

**Admin (Academic Controller)**

- Create & manage Degrees, Departments, Semesters, Subjects
- Assign teachers to subjects and allocate classes
- Control semester progression (auto-updates student subjects)
- Enable/disable users
- Toggle exam mode (disables AI during exams)

**Student**

- Auto-assigned subjects based on semester
- AI Tutor with subject-specific RAG (Socratic teaching)
- Quizzes with instant evaluation
- Assignment submission & tracking
- Weak topic detection & analytics
- Direct chat with teachers

**Teacher**

- View allocated classes and students
- Create MCQ quizzes with explanations
- Post assignments and grade submissions
- View class-level weak topic analytics
- Chat with students (with urgent flag)

### 🧠 AI Features

- **Local AI Only** - Phi-3 Mini via Ollama (no cloud APIs)
- **Subject-wise RAG** - Isolated FAISS indexes per subject
- **MiniLM Embeddings** - Efficient local embeddings
- **Socratic Teaching** - Guided questioning approach
- **Mandatory Citations** - Always references source material
- **Out-of-scope Refusal** - Politely declines non-syllabus questions
- **Exam Mode** - Admin can disable AI during exams

### 📊 Analytics

- **Weak Topic Detection** - Analyzes quiz mistakes & AI doubts
- **Student-level** - Personal weak topics with scores
- **Class-level** - Aggregated for teacher insights

## 🛠️ Tech Stack

### Backend

- **Python 3.11+**
- **FastAPI** - Modern async web framework
- **SQLAlchemy** - ORM for MySQL
- **JWT** - Secure authentication
- **Pydantic** - Data validation

### AI Stack

- **Ollama** - Local LLM runtime
- **Phi-3 Mini** - Microsoft's small, efficient LLM
- **FAISS** - Vector similarity search
- **Sentence-Transformers** - MiniLM embeddings
- **PyPDF** - PDF text extraction

### Frontend

- **Next.js 14** - React framework
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icons

### Database

- **PostgreSQL 8.0+** - Single source of truth

## 📁 Project Structure

```
rag-tutor/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # Environment config
│   │   ├── database.py          # MySQL connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── ai/                  # RAG pipeline
│   │   └── utils/               # Helpers
│   ├── faiss_indexes/           # Subject FAISS indexes
│   ├── uploads/                 # Files (disk storage)
│   ├── schema.sql               # Complete DB schema
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/app/                 # Next.js pages
│   ├── src/components/          # React components
│   └── ...
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

1. **Python 3.11+**
2. **Node.js 18+**
3. **MySQL 8.0+**
4. **Ollama** - [Install Ollama](https://ollama.ai)

### 1. Setup Database

```bash
# Login to MySQL
mysql -u root -p

# Create database and run schema
CREATE DATABASE rag_tutor;
USE rag_tutor;
SOURCE backend/schema.sql;
```

### 2. Setup Ollama & Model

```bash
# Install Ollama (Windows/Mac/Linux)
# Visit: https://ollama.ai/download

# Pull Phi-3 Mini model
ollama pull phi3:mini

# Start Ollama (runs on http://localhost:11434)
ollama serve
```

### 3. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env with your MySQL credentials

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 5. Access Application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000>
- **API Docs**: <http://localhost:8000/docs>

### Default Admin Login

- **Email**: <admin@college.edu>
- **Password**: Admin@123

### Default Teacher Login

- **Email**: <teacher@college.edu>
- **Password**: Teacher@123

### Default Student Login

- **Email**: <student@college.edu>
- **Password**: Student@123

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register/student` | Student registration |
| POST | `/api/auth/register/teacher` | Teacher registration (admin) |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/admin/degrees` | Manage degrees |
| CRUD | `/api/admin/departments` | Manage departments |
| CRUD | `/api/admin/subjects` | Manage subjects |
| POST | `/api/admin/allocations` | Allocate teachers |
| POST | `/api/admin/semester-progression` | Progress semester |
| PATCH | `/api/admin/settings` | Toggle exam mode |

### Student

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/profile` | Get profile |
| GET | `/api/student/subjects` | Current subjects |
| GET | `/api/student/dashboard` | Dashboard stats |

### AI Tutor

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Query AI tutor |
| GET | `/api/ai/subjects` | Subjects with PDFs |
| GET | `/api/ai/status` | Check exam mode |
| POST | `/api/ai/subjects/{id}/pdfs` | Upload PDF (admin) |

### Quiz

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quizzes/` | Create quiz (teacher) |
| GET | `/api/quizzes/student` | Available quizzes |
| POST | `/api/quizzes/student/{id}/submit` | Submit quiz |

## 🔒 Security

- **JWT Authentication** with configurable expiry
- **Role-based Access Control** (Admin/Student/Teacher)
- **Password Hashing** with bcrypt
- **Rate Limiting** for AI queries (10/minute)
- **Exam Mode** to disable AI during exams
- **Audit Logging** for admin actions

## 📝 Design Decisions

### Files on Disk, Paths in MySQL

All file uploads (PDFs, assignments, profile pictures) are stored on disk with only the paths saved in MySQL. This is more efficient and scalable than storing blobs in the database.

### Per-Subject FAISS Indexes

Each subject has its own isolated FAISS index. This allows:

- Faster searches (smaller indexes)
- Subject-specific context only
- Independent re-indexing

### Soft Delete Pattern

Academic records are never hard-deleted. All entities use `is_active = FALSE` for deactivation, preserving data integrity and audit trail.

### Socratic AI Tutor

The AI is prompted to use the Socratic method - asking guiding questions before giving direct answers, encouraging critical thinking.

## 🎨 UI Themes

- **Student**: Muted Blue (#4A6FA5) + Soft Green (#6B9080)
- **Teacher**: Deep Teal (#2C7A7B) + Muted Purple (#6B5B95)
- **Admin**: Neutral Gray (#4A5568) + Dark Slate (#2D3748)

No neon colors or heavy gradients - professional academic styling.

## 📄 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for academic excellence.
