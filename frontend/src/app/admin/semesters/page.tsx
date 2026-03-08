'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface Semester {
    id: number;
    degree_id: number;
    number: number;
}

interface Degree {
    id: number;
    name: string;
    code: string;
}

export default function AdminSemesters() {
    const { data: semestersData, isLoading: loadingSemesters, mutate: mutateSemesters } = useSWR<Semester[]>('/api/admin/semesters', fetcher);
    const { data: degreesData, isLoading: loadingDegrees } = useSWR<Degree[]>('/api/admin/degrees', fetcher);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        degree_id: '',
        number: 1
    });

    const semesters = semestersData || [];
    const degrees = degreesData || [];
    const loading = loadingSemesters || loadingDegrees;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newSemester = {
                id: Date.now(), // Temporary ID for optimistic update
                degree_id: parseInt(formData.degree_id),
                number: formData.number
            };
            mutateSemesters([...semesters, newSemester], false);

            await api.post('/api/admin/semesters', {
                degree_id: parseInt(formData.degree_id),
                number: formData.number
            });

            mutateSemesters(); // Revalidate
            setShowModal(false);
            setFormData({ degree_id: '', number: 1 });
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to create semester');
            mutateSemesters();
        }
    };

    const groupedSemesters = degrees.map(degree => ({
        degree,
        semesters: semesters.filter(s => s.degree_id === degree.id).sort((a, b) => a.number - b.number)
    }));

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
                    <h1 className="text-2xl font-bold text-gray-800">Semesters</h1>
                    <p className="text-gray-500 mt-1">Manage semesters for each degree.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Semester
                </button>
            </div>

            {/* Grouped by Degree */}
            <div className="space-y-6">
                {groupedSemesters.map(({ degree, semesters }) => (
                    <div key={degree.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-800">{degree.name} ({degree.code})</h3>
                        </div>
                        <div className="p-6">
                            {semesters.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No semesters created for this degree yet.</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {semesters.map((semester) => (
                                        <div
                                            key={semester.id}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-admin-primary/10 rounded-lg border border-admin-primary/20"
                                        >
                                            <Calendar className="w-4 h-4 text-admin-primary" />
                                            <span className="font-medium text-admin-primary">Semester {semester.number}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {degrees.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                        No degrees found. Please create a degree first.
                    </div>
                )}
            </div>

            {/* Add Semester Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Add Semester</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester Number</label>
                                <input
                                    type="number"
                                    value={formData.number}
                                    onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) })}
                                    className="input-admin"
                                    min="1"
                                    max="12"
                                    placeholder="e.g., 1"
                                    required
                                />
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
                                    Add Semester
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
