CREATE DATABASE "rag-tutor";

create type roles as enum ('admin', 'student', 'teacher');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role roles NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    profile_picture VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS degrees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    duration_years INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    number INT NOT NULL,
    degree_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (degree_id) REFERENCES degrees(id) ON DELETE CASCADE,
    CONSTRAINT unique_sem_degree UNIQUE (number, degree_id)
);

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    credits INT DEFAULT 3,
    degree_id INT NOT NULL,
    department_id INT NOT NULL,
    semester_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (degree_id) REFERENCES degrees(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    degree_id INT NOT NULL,
    department_id INT NOT NULL,
    current_semester_id INT NOT NULL,
    passout_year INT NOT NULL,
    admission_year INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (degree_id) REFERENCES degrees(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (current_semester_id) REFERENCES semesters(id)
);

CREATE TABLE IF NOT EXISTS student_subjects (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    semester_id INT NOT NULL,
    academic_year VARCHAR(9) NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    CONSTRAINT unique_student_subject UNIQUE (student_id, subject_id, academic_year)
);

CREATE TABLE IF NOT EXISTS semester_history (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    academic_year VARCHAR(9) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

CREATE TYPE selected_option AS ENUM ('A', 'B', 'C', 'D');

CREATE TABLE IF NOT EXISTS teacher_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    department_id INT NOT NULL,
    designation VARCHAR(100),
    joining_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year VARCHAR(9) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT unique_teacher_subject UNIQUE (teacher_id, subject_id, academic_year)
);


-- Class allocations (teacher to degree+department+semester)
CREATE TABLE IF NOT EXISTS class_allocations (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL,
    degree_id INT NOT NULL,
    department_id INT NOT NULL,
    semester_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year VARCHAR(9) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (degree_id) REFERENCES degrees(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ==========================================
-- QUIZ MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    duration_minutes INT DEFAULT 30,
    total_marks INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_option selected_option NOT NULL,
    marks INT DEFAULT 1,
    explanation TEXT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    score INT DEFAULT 0,
    total_questions INT NOT NULL,
    correct_answers INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
    CONSTRAINT unique_attempt UNIQUE (quiz_id, student_id)
);



CREATE TABLE IF NOT EXISTS quiz_responses (
    id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option selected_option,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
);

-- ==========================================
-- ASSIGNMENT MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_marks INT DEFAULT 100,
    attachment_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id)
);

CREATE TYPE assignment_status AS ENUM ('submitted', 'graded', 'late', 'resubmit');

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_url VARCHAR(500) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marks_obtained INT,
    feedback TEXT,
    status assignment_status DEFAULT 'submitted',
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
    CONSTRAINT unique_submission UNIQUE (assignment_id, student_id)
);

-- ==========================================
-- CHAT MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    subject_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT unique_conversation UNIQUE (student_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_role roles NOT NULL,
    message TEXT NOT NULL,
    is_urgent BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- ==========================================
-- AI TUTOR MODULE
-- ==========================================

-- PDF documents for RAG (files on disk, paths in MySQL)
CREATE TABLE IF NOT EXISTS pdf_documents (
    id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    uploaded_by INT NOT NULL,
    is_indexed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    indexed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- AI chat sessions
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TYPE ai_chat_role AS ENUM ('user', 'assistant');

-- AI chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    role ai_chat_role NOT NULL,
    content TEXT NOT NULL,
    citations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
);

-- AI doubts tracking (for weak topic detection)
CREATE TABLE IF NOT EXISTS ai_doubt_log (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    topic VARCHAR(255),
    question TEXT NOT NULL,
    asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
--     INDEX idx_student_subject (student_id, subject_id)
);

-- AI rate limiting
CREATE TABLE IF NOT EXISTS ai_rate_limits (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    query_count INT DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CONSTRAINT unique_student UNIQUE (student_id)
);

-- ==========================================
-- WEAK TOPIC DETECTION
-- ==========================================

CREATE TYPE weak_source AS ENUM('quiz', 'ai_doubts', 'combined');

CREATE TABLE IF NOT EXISTS weak_topics (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    weakness_score DECIMAL(5,2) DEFAULT 0,
    source weak_source NOT NULL,
    quiz_error_count INT DEFAULT 0,
    ai_doubt_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT unique_weak_topic UNIQUE (student_id, subject_id, topic_name)
);

-- Class-level weak topics (aggregated for teachers)
CREATE TABLE IF NOT EXISTS class_weak_topics (
    id SERIAL PRIMARY KEY,
    degree_id INT NOT NULL,
    department_id INT NOT NULL,
    semester_id INT NOT NULL,
    subject_id INT NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    affected_students INT DEFAULT 0,
    avg_weakness_score DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (degree_id) REFERENCES degrees(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ==========================================
-- AUDIT LOGGING (Admin Safety)
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
--     INDEX idx_entity (entity, entity_id),
--     INDEX idx_user (user_id),
--     INDEX idx_created (created_at)
);

-- ==========================================
-- SYSTEM SETTINGS (Exam Mode & Controls)
-- ==========================================

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value VARCHAR(500) NOT NULL,
    description VARCHAR(255),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE class_notes
(
    id SERIAL PRIMARY KEY,
    class_allocation_id INTEGER NOT NULL REFERENCES class_allocations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAT(500) NOT NULL,
    uploaded_at timestamp default CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('ai_tutor_enabled', 'true', 'Enable/disable AI Tutor globally'),
('ai_rate_limit_per_minute', '10', 'Max AI queries per student per minute'),
('exam_mode', 'false', 'When true, AI Tutor is disabled for academic integrity');

-- ==========================================
-- DEFAULT ADMIN USER
-- Password: Admin@123 (bcrypt hash)
-- ==========================================

INSERT INTO users (email, password_hash, role, full_name, is_active)
VALUES ('admin@college.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewofV5mNPd.W7iZu', 'admin', 'System Administrator', TRUE);

-- ==========================================
-- SAMPLE DATA (Optional)
-- ==========================================

-- Sample Degrees
INSERT INTO degrees (name, code, duration_years) VALUES
('Bachelor of Technology', 'BTECH', 4),
('Master of Technology', 'MTECH', 2),
('Bachelor of Computer Applications', 'BCA', 3),
('Master of Computer Applications', 'MCA', 2);

-- Sample Departments
INSERT INTO departments (name, code) VALUES
('Computer Science & Engineering', 'CSE'),
('Electronics & Communication', 'ECE'),
('Information Technology', 'IT'),
('Artificial Intelligence & ML', 'AIML');

-- student_email = "student@college.edu" student_password = "Student@123"
INSERT INTO users (email, password_hash, role, full_name, phone, is_active) VALUES ('student@college.edu', '$2b$12$Jl/xJqbeUYfRyLaflhFXpuGx0r2xLKnIU9H7ab4EXQ23/9jJSVawu', 'student', 'John Doe', '9876543210', true);
-- teacher_email = "teacher@college.edu" teacher_password = "Teacher@123"
INSERT INTO users (email, password_hash, role, full_name, phone, is_active) VALUES ('teacher@college.edu', '$2b$12$nw8/NH3e3pNIR.9U9pqANOSbgmMe4ph3HHZWtMrpbcyQnpPMwKY2a', 'teacher', 'Jane Smith', '9876543211', true);