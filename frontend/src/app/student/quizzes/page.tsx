'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useMemo } from 'react';
import { Clock, FileText, CheckCircle, PlayCircle, Award } from 'lucide-react';

interface Quiz {
    id: number;
    title: string;
    description: string;
    subject_id: number;
    duration_minutes: number;
    total_marks: number;
    is_attempted: boolean;
    is_completed: boolean;
    score: number | null;
}

interface Subject {
    id: number;
    name: string;
    code: string;
}

export default function StudentQuizzes() {
    const router = useRouter();

    const { data: quizzesData, isLoading: loadingQuizzes } = useSWR<Quiz[]>('/api/quizzes/student', fetcher);
    const { data: subjectsData, isLoading: loadingSubjects } = useSWR<{ subjects: Subject[] }>('/api/student/subjects', fetcher);

    const loading = loadingQuizzes || loadingSubjects;
    const quizzes = quizzesData || [];

    const subjects = useMemo(() => {
        const map: Record<number, Subject> = {};
        if (subjectsData?.subjects) {
            subjectsData.subjects.forEach(s => {
                map[s.id] = s;
            });
        }
        return map;
    }, [subjectsData]);

    const getStatusBadge = (quiz: Quiz) => {
        if (quiz.is_completed) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Completed: {quiz.score}/{quiz.total_marks}</span>;
        }
        if (quiz.is_attempted) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">In Progress</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Available</span>;
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
            <h1 className="text-2xl font-bold text-gray-800">Quizzes</h1>

            {quizzes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="mx-auto h-16 w-16 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No quizzes available</h3>
                    <p className="mt-2 text-gray-500">There are no active quizzes for you at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-gray-800">{quiz.title}</h3>
                                        {getStatusBadge(quiz)}
                                    </div>

                                    <p className="text-gray-500 font-medium mb-3">
                                        {subjects[quiz.subject_id]?.name || 'Unknown Subject'}
                                        <span className="text-gray-400 mx-2">•</span>
                                        <span className="text-sm font-normal">{subjects[quiz.subject_id]?.code}</span>
                                    </p>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <Clock className="w-4 h-4 mr-2" />
                                            {quiz.duration_minutes} mins
                                        </div>
                                        <div className="flex items-center">
                                            <Award className="w-4 h-4 mr-2" />
                                            {quiz.total_marks} marks
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/student/quizzes/${quiz.id}`)}
                                    className={`px-6 py-2 rounded-lg transition-colors font-medium whitespace-nowrap flex items-center ${quiz.is_completed
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-teacher-primary text-white hover:bg-opacity-90'
                                        }`}
                                >
                                    {quiz.is_completed ? (
                                        <>
                                            <FileText className="w-4 h-4 mr-2" />
                                            View Result
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle className="w-4 h-4 mr-2" />
                                            Start Quiz
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
