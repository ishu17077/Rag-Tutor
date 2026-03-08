'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, ClipboardList, FileText, MessageSquare, BarChart3 } from 'lucide-react';
import api from '@/lib/api';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface DashboardData {
    teacher_name: string;
    employee_id: string;
    department: string;
    allocated_classes: number;
    active_quizzes: number;
    active_assignments: number;
    pending_grading: number;
    unread_messages: number;
}

export default function TeacherDashboard() {
    const { data, isLoading: loading } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher);

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
            <div className="bg-gradient-to-r from-teacher-primary to-teacher-secondary rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">Welcome, {data?.teacher_name}! 👋</h1>
                <p className="text-white/80 mt-1">
                    {data?.department} | Employee ID: {data?.employee_id}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="card card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Classes</p>
                            <p className="text-xl font-bold text-gray-800">{data?.allocated_classes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Active Quizzes</p>
                            <p className="text-xl font-bold text-gray-800">{data?.active_quizzes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Assignments</p>
                            <p className="text-xl font-bold text-gray-800">{data?.active_assignments || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Pending Grading</p>
                            <p className="text-xl font-bold text-gray-800">{data?.pending_grading || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Messages</p>
                            <p className="text-xl font-bold text-gray-800">{data?.unread_messages || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/teacher/quizzes/create" className="p-4 bg-teacher-primary/5 rounded-lg hover:bg-teacher-primary/10 transition-colors text-center group">
                            <ClipboardList className="w-8 h-8 text-teacher-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Create Quiz</span>
                        </Link>
                        <Link href="/teacher/assignments/create" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center group">
                            <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Post Assignment</span>
                        </Link>
                        <Link href="/teacher/classes" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center group">
                            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">View Classes</span>
                        </Link>
                        <Link href="/teacher/analytics" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center group">
                            <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Class Analytics</span>
                        </Link>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Weak Topics Insight</h2>
                    <div className="bg-gradient-to-br from-teacher-primary/5 to-teacher-secondary/5 rounded-xl p-6 text-center">
                        <BarChart3 className="w-16 h-16 text-teacher-primary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Class Analytics</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            View aggregated weak topics across your classes to identify areas that need more focus.
                        </p>
                        <Link
                            href="/teacher/analytics"
                            className="inline-block px-6 py-2 bg-teacher-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            View Analytics
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
