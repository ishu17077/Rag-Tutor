'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Users, BookOpen, Calendar, GraduationCap, ArrowRight } from 'lucide-react';

interface ClassAllocation {
    id: number;
    degree: { id: number; name: string; code: string };
    department: { id: number; name: string; code: string };
    semester: { id: number; number: number };
    subject: { id: number; name: string; code: string };
    academic_year: string;
    student_count: number;
}

export default function TeacherClasses() {
    const router = useRouter();
    const { data: classesData, isLoading: loading } = useSWR<ClassAllocation[]>('/api/teacher/classes', fetcher);
    const classes = classesData || [];

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
                    <h1 className="text-2xl font-bold text-gray-800">My Classes</h1>
                    <p className="text-gray-500 mt-1">View and manage your allocated classes</p>
                </div>
            </div>

            {classes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
                    <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No classes allocated</h3>
                    <p className="mt-2 text-gray-500">You haven't been allocated any classes yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <span className="px-2 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-full">
                                        Active
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-1">{cls.subject.name}</h3>
                                <p className="text-sm text-gray-500 mb-4">{cls.subject.code}</p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <GraduationCap className="w-4 h-4 mr-2 text-gray-400" />
                                        <span>{cls.degree.code} - {cls.department.code}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                        <span>Semester {cls.semester.number} ({cls.academic_year})</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                                        <span>{cls.student_count} Students</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/teacher/classes/${cls.id}`)}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-blue-100 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                                >
                                    View Details
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
