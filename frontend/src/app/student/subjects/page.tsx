'use client';

import { useEffect, useState } from 'react';
import { BookOpen, User } from 'lucide-react';
import api from '@/lib/api';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface Subject {
    id: number;
    name: string;
    code: string;
    credits: number;
    teacher: {
        id: number;
        name: string;
        email: string;
    } | null;
}

export default function MySubjects() {
    const { data, isLoading: loading } = useSWR<{ subjects: Subject[], semester_number: number }>('/api/student/subjects', fetcher);
    const subjects: Subject[] = data?.subjects || [];
    const semester: number = data?.semester_number || 0;

    // Modal State
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const router = require('next/navigation').useRouter();

    const handleTeacherClick = (teacher: any, subject: Subject) => {
        setSelectedTeacher({ ...teacher, subject_id: subject.id, subject_name: subject.name });
        setShowModal(true);
    };

    const handleStartChat = async () => {
        if (!selectedTeacher) return;
        try {
            const response = await api.post('/api/chat/conversations', {
                teacher_id: selectedTeacher.id,
                subject_id: selectedTeacher.subject_id
            });
            setShowModal(false);
            // If existing, it returns { id: ..., message: ... }
            // If new, it returns { id: ..., message: ... }
            // So ID is always available.
            router.push(`/student/chat?id=${response.data.id}`);
        } catch (error: any) {
            console.error('Chat error:', error);
            // If backend returns existing conversation with same endpoint, error might not be thrown if status is 200.
            // If status is 4xx, we handle here.
            alert('Failed to start chat. Please try again.');
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
            <div>
                <h1 className="text-2xl font-bold text-gray-800">My Subjects</h1>
                <p className="text-gray-500 mt-1">
                    Enrolled subjects for Semester {semester}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No subjects found</h3>
                        <p className="text-gray-500 mt-1">
                            You don't have any subjects assigned for this semester yet.
                        </p>
                    </div>
                ) : (
                    subjects.map((subject) => (
                        <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-student-primary/10 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-student-primary" />
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100">
                                        {subject.credits} Credits
                                    </span>
                                </div>

                                <div className="flex-1 mb-6">
                                    <h3
                                        className="text-lg font-bold text-gray-800 mb-1.5 cursor-pointer hover:text-student-primary transition-colors line-clamp-2 leading-tight"
                                        onClick={() => router.push(`/student/subjects/${subject.id}`)}
                                        title={subject.name}
                                    >
                                        {subject.name}
                                    </h3>
                                    <div className="flex items-center text-sm text-gray-500 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded">
                                        {subject.code}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 mt-auto">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <div className="p-1.5 bg-gray-100 rounded-full">
                                                <User className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                            {subject.teacher ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTeacherClick(subject.teacher, subject);
                                                    }}
                                                    className="font-medium hover:text-student-primary hover:underline truncate max-w-[120px]"
                                                >
                                                    {subject.teacher.name}
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 italic">No teacher</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => router.push(`/student/subjects/${subject.id}`)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-student-primary hover:text-white transition-all duration-300 group/btn"
                                    >
                                        <BookOpen className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                        <span>View Resources</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Teacher Profile Modal */}
            {showModal && selectedTeacher && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-student-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-student-primary">
                                    {selectedTeacher.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">{selectedTeacher.name}</h2>
                            <p className="text-gray-500 text-sm">{selectedTeacher.email}</p>
                            <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                                Teacher for {selectedTeacher.subject_name}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleStartChat}
                                className="flex-1 px-4 py-2 bg-student-primary text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                            >
                                <span>Chat</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
