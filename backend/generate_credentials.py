# """
# Generate password hashes for adding test users to the database
# """
# from passlib.context import CryptContext

# # Same context as in app/utils/security.py
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# # Student credentials
# student_email = "student@college.edu"
# student_password = "Student@123"
# student_hash = pwd_context.hash(student_password)

# # Teacher credentials
# teacher_email = "teacher@college.edu"
# teacher_password = "Teacher@123"
# teacher_hash = pwd_context.hash(teacher_password)

# print("=" * 70)
# print("PASSWORD HASHES FOR DATABASE")
# print("=" * 70)
# print(f"\nSTUDENT:")
# print(f"  Email: {student_email}")
# print(f"  Password: {student_password}")
# print(f"  Hash: {student_hash}")

# print(f"\nTEACHER:")
# print(f"  Email: {teacher_email}")
# print(f"  Password: {teacher_password}")
# print(f"  Hash: {teacher_hash}")

# print("\n" + "=" * 70)
# print("SQL COMMANDS TO INSERT USERS")
# print("=" * 70)

# sql_student = f"""
# -- Insert student user
# INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
# VALUES ('{student_email}', '{student_hash}', 'student', 'John Doe', '9876543210', true);

# -- Get the student user ID (usually will be higher than 1, adjust if needed)
# -- Then insert student profile
# INSERT INTO student_profiles (user_id, roll_number, degree_id, department_id, current_semester_id, passout_year, admission_year)
# VALUES (2, 'CS2024001', 1, 1, 1, 2027, 2024);
# """

# sql_teacher = f"""
# -- Insert teacher user
# INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
# VALUES ('{teacher_email}', '{teacher_hash}', 'teacher', 'Jane Smith', '9876543211', true);

# -- Get the teacher user ID (usually will be higher than 2, adjust if needed)
# -- Then insert teacher profile
# INSERT INTO teacher_profiles (user_id, employee_id, department_id, designation, joining_date)
# VALUES (3, 'EMP001', 1, 'Assistant Professor', '2023-01-15');
# """

# print("\nSTUDENT SQL:")
# print(sql_student)

# print("\nTEACHER SQL:")
# print(sql_teacher)

# print("\n" + "=" * 70)
# print("QUICK INSERT COMMANDS (Update user IDs as needed)")
# print("=" * 70)

# quick_sql = f"""
# -- Insert both users
# INSERT INTO users (email, password_hash, role, full_name, phone, is_active) VALUES ('{student_email}', '{student_hash}', 'student', 'John Doe', '9876543210', true);
# INSERT INTO users (email, password_hash, role, full_name, phone, is_active) VALUES ('{teacher_email}', '{teacher_hash}', 'teacher', 'Jane Smith', '9876543211', true);

# -- Insert profiles (adjust user_id values based on actual IDs)
# INSERT INTO student_profiles (user_id, roll_number, degree_id, department_id, current_semester_id, passout_year, admission_year) VALUES (2, 'CS2024001', 1, 1, 1, 2027, 2024);
# INSERT INTO teacher_profiles (user_id, employee_id, department_id, designation, joining_date) VALUES (3, 'EMP001', 1, 'Assistant Professor', '2023-01-15');
# """

# print(quick_sql)
