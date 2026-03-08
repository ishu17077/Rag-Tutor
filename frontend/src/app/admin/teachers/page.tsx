'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Search, Plus, BookOpen, X, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface Teacher {
    id: number;
    profile_id: number;
    email: string;
    full_name: string;
    phone: string | null;
    is_active: boolean;
    created_at: string;
    employee_id: string;
    department: string | null;
    designation: string | null;
    subjects: string[];
}

interface Degree { id: number; name: string; }
interface Department { id: number; name: string; }
interface Semester { id: number; number: number; degree_id: number; }
interface Subject { id: number; name: string; code: string; degree_id: number; department_id: number; semester_id: number; }

export default function AdminTeachers() {
    const { data: teachersData, isLoading: loadingTeachers, mutate: mutateTeachers } = useSWR<Teacher[]>('/api/admin/teachers-full', fetcher);
    const { data: degreesData, isLoading: loadingDegrees } = useSWR<Degree[]>('/api/admin/degrees', fetcher);
    const { data: departmentsData, isLoading: loadingDepartments } = useSWR<Department[]>('/api/admin/departments', fetcher);
    const { data: semestersData, isLoading: loadingSemesters } = useSWR<Semester[]>('/api/admin/semesters', fetcher);
    const { data: subjectsData, isLoading: loadingSubjects } = useSWR<Subject[]>('/api/admin/subjects', fetcher);

    const teachers = teachersData || [];
    const degrees = degreesData || [];
    const departments = departmentsData || [];
    const semesters = semestersData || [];
    const subjects = subjectsData || [];

    const loading = loadingTeachers || loadingDegrees || loadingDepartments || loadingSemesters || loadingSubjects;
    const [searchTerm, setSearchTerm] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [formData, setFormData] = useState({
        degree_id: '',
        department_id: '',
        semester_id: '',
        subject_id: '',
        academic_year: '2025-2026'
    });

    const handleAssignClick = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setFormData({
            degree_id: '',
            department_id: '',
            semester_id: '',
            subject_id: '',
            academic_year: '2025-2026'
        });
        setShowModal(true);
    };

    const handleAllocate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacher || isAssigning) return;

        setIsAssigning(true);
        try {
            const selectedSubject = subjects.find(s => s.id === parseInt(formData.subject_id));
            if (selectedSubject) {
                // Optimistic Update
                const updatedTeachers = teachers.map(t =>
                    t.id === selectedTeacher.id
                        ? { ...t, subjects: [...t.subjects, selectedSubject.name] }
                        : t
                );
                mutateTeachers(updatedTeachers, false);
            }

            await api.post('/api/admin/allocations', {
                teacher_id: selectedTeacher.profile_id,
                subject_id: parseInt(formData.subject_id),
                degree_id: parseInt(formData.degree_id),
                department_id: parseInt(formData.department_id),
                semester_id: parseInt(formData.semester_id),
                academic_year: formData.academic_year
            });

            mutateTeachers(); // revalidate
            setShowModal(false);
            alert('Subject assigned successfully!');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Failed to assign subject');
            mutateTeachers();
        } finally {
            setIsAssigning(false);
        }
    };

    // Filter Logic for Modal
    const filteredSemesters = semesters.filter(s =>
        !formData.degree_id || s.degree_id === parseInt(formData.degree_id)
    );

    const filteredSubjects = subjects.filter(s =>
        (!formData.degree_id || s.degree_id === parseInt(formData.degree_id)) &&
        (!formData.department_id || s.department_id === parseInt(formData.department_id)) &&
        (!formData.semester_id || s.semester_id === parseInt(formData.semester_id))
    );

    const filteredTeachers = teachers.filter(t =>
        t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
                <p className="text-gray-500 mt-1">Manage teacher accounts and details.</p>
            </div>

            {/* Search */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, or employee ID..."
                        className="input-admin pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTeachers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No teachers found
                                    </td>
                                </tr>
                            ) : (
                                filteredTeachers.map((teacher) => (
                                    <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-teacher-primary/10 rounded-full flex items-center justify-center">
                                                    <span className="text-teacher-primary font-medium">
                                                        {teacher.full_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{teacher.full_name}</p>
                                                    <p className="text-xs text-gray-500">{teacher.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded">
                                                {teacher.employee_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {teacher.subjects.length > 0 ? (
                                                    teacher.subjects.map((sub, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                                            {sub}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No subjects</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {teacher.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <XCircle className="w-3 h-3" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleAssignClick(teacher)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-admin-primary bg-admin-primary/10 rounded-lg hover:bg-admin-primary/20 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Assign Subject
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assign Subject Modal */}
            {showModal && selectedTeacher && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Assign Subject</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100">
                                <UserIcon className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{selectedTeacher.full_name}</p>
                                <p className="text-xs text-gray-500">{selectedTeacher.department}</p>
                            </div>
                        </div>

                        <form onSubmit={handleAllocate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                                <select
                                    value={formData.degree_id}
                                    onChange={(e) => setFormData({ ...formData, degree_id: e.target.value })}
                                    className="input-admin"
                                    required
                                >
                                    <option value="">Select Degree</option>
                                    {degrees.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    className="input-admin"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                <select
                                    value={formData.semester_id}
                                    onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
                                    className="input-admin"
                                    required
                                >
                                    <option value="">Select Semester</option>
                                    {filteredSemesters.map(s => (
                                        <option key={s.id} value={s.id}>Semester {s.number}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <select
                                    value={formData.subject_id}
                                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                    className="input-admin"
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {filteredSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAssigning}
                                    className={`flex-1 px-4 py-2 bg-admin-primary text-white rounded-lg transition-opacity ${isAssigning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'
                                        }`}
                                >
                                    {isAssigning ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
