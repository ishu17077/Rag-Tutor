'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Plus, Clock, FileText, Calendar, Edit, Trash2, Users } from 'lucide-react';

interface Quiz {
    id: number;
    title: string;
    subject_id: number;
    duration_minutes: number;
    total_marks: number;
    created_at: string;
    is_active: boolean;
}

interface Subject {
    id: number;
    name: string;
    code: string;
}

export default function TeacherQuizzes() {
    const router = useRouter();
    const { data: quizzesData, isLoading: loadingQuizzes, mutate: mutateQuizzes } = useSWR<Quiz[]>('/api/quizzes/teacher', fetcher);
    const { data: subjectsData, isLoading: loadingSubjects } = useSWR<Subject[]>('/api/teacher/subjects', fetcher);

    // Compute derived state consistently without triggering re-renders
    const quizzes = quizzesData || [];
    const loading = loadingQuizzes || loadingSubjects;

    // Create subject map for easy lookup
    const subjectMap: Record<number, Subject> = {};
    if (subjectsData) {
        subjectsData.forEach((s: Subject) => {
            subjectMap[s.id] = s;
        });
    }
    const subjects = subjectMap;

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
            return;
        }

        try {
            // Optimistic update
            mutateQuizzes(quizzes.filter(q => q.id !== id), false);
            await api.delete(`/api/quizzes/teacher/${id}`);
            mutateQuizzes(); // Revalidate
        } catch (error) {
            console.error('Failed to delete quiz:', error);
            alert('Failed to delete quiz');
            mutateQuizzes(); // Revert state on error
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teacher-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quizzes</h1>
                    <p className="text-gray-500 mt-1">Create and manage quizzes for your students</p>
                </div>
                <button
                    onClick={() => router.push('/teacher/quizzes/create')}
                    className="flex items-center px-4 py-2 bg-teacher-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quiz
                </button>
            </div>

            {quizzes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="mx-auto h-16 w-16 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No quizzes created yet</h3>
                    <p className="mt-2 text-gray-500 mb-6">Start by creating your first quiz for your students.</p>
                    <button
                        onClick={() => router.push('/teacher/quizzes/create')}
                        className="inline-flex items-center px-4 py-2 bg-teacher-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Quiz
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex-1 space-y-4 md:space-y-0">
                                <div className="flex items-start justify-between md:block">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-gray-800">{quiz.title}</h3>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${quiz.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {quiz.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 font-medium">
                                            {subjects[quiz.subject_id]?.name || 'Unknown Subject'}
                                            <span className="text-gray-400 font-normal mx-2">•</span>
                                            <span className="text-sm font-normal text-gray-500">
                                                {subjects[quiz.subject_id]?.code}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Mobile Actions Menu could go here */}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                        {quiz.duration_minutes} mins
                                    </div>
                                    <div className="flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-gray-400" />
                                        {quiz.total_marks} marks
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                        {new Date(quiz.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6 md:mt-0 md:pl-6 md:border-l border-gray-100">
                                <button
                                    onClick={() => router.push(`/teacher/quizzes/${quiz.id}`)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Quiz"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                                {/* Results Button - Future Implementation */}
                                <button
                                    onClick={() => router.push(`/teacher/quizzes/${quiz.id}/results`)}
                                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="View Results"
                                >
                                    <Users className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(quiz.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Quiz"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
