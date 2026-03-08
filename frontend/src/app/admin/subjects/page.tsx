'use client';

import { useEffect, useState } from 'react';
import { Plus, X, BookOpen } from 'lucide-react';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface Subject {
    id: number;
    name: string;
    code: string;
    credits: number;
    degree_id: number;
    department_id: number;
    semester_id: number;
    is_active: boolean;
}

interface Degree {
    id: number;
    name: string;
    code: string;
}

interface Department {
    id: number;
    name: string;
}

interface Semester {
    id: number;
    degree_id: number;
    number: number;
}

export default function AdminSubjects() {
    const { data: subjectsData, isLoading: loadingSubjects, mutate: mutateSubjects } = useSWR<Subject[]>('/api/admin/subjects', fetcher);
    const { data: degreesData, isLoading: loadingDegrees } = useSWR<Degree[]>('/api/admin/degrees', fetcher);
    const { data: departmentsData, isLoading: loadingDepartments } = useSWR<Department[]>('/api/admin/departments', fetcher);
    const { data: semestersData, isLoading: loadingSemesters } = useSWR<Semester[]>('/api/admin/semesters', fetcher);

    const [showModal, setShowModal] = useState(false);

    const subjects = subjectsData || [];
    const degrees = degreesData || [];
    const departments = departmentsData || [];
    const semesters = semestersData || [];

    const loading = loadingSubjects || loadingDegrees || loadingDepartments || loadingSemesters;

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        credits: 3,
        degree_id: '',
        department_id: '',
        semester_id: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newSubject = {
                id: Date.now(), // Temporary ID for optimistic update
                ...formData,
                degree_id: parseInt(formData.degree_id),
                department_id: parseInt(formData.department_id),
                semester_id: parseInt(formData.semester_id),
                is_active: true
            };
            mutateSubjects([...subjects, newSubject], false);

            await api.post('/api/admin/subjects', {
                ...formData,
                degree_id: parseInt(formData.degree_id),
                department_id: parseInt(formData.department_id),
                semester_id: parseInt(formData.semester_id)
            });
            mutateSubjects(); // revalidate
            setShowModal(false);
            setFormData({ name: '', code: '', credits: 3, degree_id: '', department_id: '', semester_id: '' });
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to create subject');
            mutateSubjects();
        }
    };

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Subjects</h1>
                    <p className="text-gray-500 mt-1">Manage subjects and curriculum.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Subject
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {subjects.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No subjects found. Click "Add Subject" to create one.
                                </td>
                            </tr>
                        ) : (
                            subjects.map((subject) => {
                                const semester = semesters.find(s => s.id === subject.semester_id);
                                return (
                                    <tr key={subject.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm font-medium text-gray-900">{subject.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">{subject.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Sem {semester?.number || '?'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{subject.credits}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${subject.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {subject.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Subject Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Add Subject</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="input-admin"
                                    placeholder="e.g., CSE301"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-admin"
                                    placeholder="e.g., Data Structures"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                                <input
                                    type="number"
                                    value={formData.credits}
                                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                                    className="input-admin"
                                    min="1"
                                    max="10"
                                    required
                                />
                            </div>
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
                                    {semesters.filter(s => !formData.degree_id || s.degree_id === parseInt(formData.degree_id)).map(s => (
                                        <option key={s.id} value={s.id}>Semester {s.number}</option>
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
                                    className="flex-1 px-4 py-2 bg-admin-primary text-white rounded-lg hover:bg-opacity-90"
                                >
                                    Add Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
