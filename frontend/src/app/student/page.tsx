'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Brain, FileText, ClipboardList, MessageSquare, TrendingDown } from 'lucide-react';
import api from '@/lib/api';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface DashboardData {
    student_name: string;
    roll_number: string;
    semester: number;
    subject_count: number;
    pending_quizzes: number;
    pending_assignments: number;
    unread_messages: number;
}

export default function StudentDashboard() {
    const { data, isLoading: loading } = useSWR<DashboardData>('/api/student/dashboard', fetcher);

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
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-student-primary to-student-secondary rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">Welcome back, {data?.student_name}! 👋</h1>
                <p className="text-white/80 mt-1">
                    Roll Number: {data?.roll_number} | Semester {data?.semester}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Subjects</p>
                            <p className="text-2xl font-bold text-gray-800">{data?.subject_count || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Quizzes</p>
                            <p className="text-2xl font-bold text-gray-800">{data?.pending_quizzes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Assignments</p>
                            <p className="text-2xl font-bold text-gray-800">{data?.pending_assignments || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Unread Messages</p>
                            <p className="text-2xl font-bold text-gray-800">{data?.unread_messages || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/student/ai-tutor" className="p-4 bg-student-primary/5 rounded-lg hover:bg-student-primary/10 transition-colors text-center group">
                            <Brain className="w-8 h-8 text-student-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Start AI Tutor</span>
                        </Link>
                        <Link href="/student/quizzes" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center group">
                            <ClipboardList className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Take Quiz</span>
                        </Link>
                        <Link href="/student/assignments" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center group">
                            <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">View Assignments</span>
                        </Link>
                        <Link href="/student/weak-topics" className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-center group">
                            <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Weak Topics</span>
                        </Link>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Tutor</h2>
                    <div className="bg-gradient-to-br from-student-primary/5 to-student-secondary/5 rounded-xl p-6 text-center">
                        <Brain className="w-16 h-16 text-student-primary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Socratic AI Tutor</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Ask questions about your subjects and get guided explanations with citations.
                        </p>
                        <Link
                            href="/student/ai-tutor"
                            className="inline-block px-6 py-2 bg-student-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            Start Learning
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
