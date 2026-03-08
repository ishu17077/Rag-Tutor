'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Book, FileText, Calendar, Clock, Download } from 'lucide-react';

interface Subject {
    id: number;
    name: string;
    code: string;
    credits: number;
    academic_year?: string;
}

export default function TeacherSubjects() {
    const { data: subjectsData, isLoading: loading } = useSWR<Subject[]>('/api/teacher/subjects', fetcher);
    const subjects = subjectsData || [];

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
                    <h1 className="text-2xl font-bold text-gray-800">My Subjects</h1>
                    <p className="text-gray-500 mt-1">Manage subject materials and syllabus</p>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
                    <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Book className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No subjects assigned</h3>
                    <p className="mt-2 text-gray-500">You don't have any subjects assigned yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <Book className="w-6 h-6" />
                                    </div>
                                    <span className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
                                        {subject.credits} Credits
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-1">{subject.name}</h3>
                                <div className="flex items-center mb-4 space-x-4">
                                    <p className="text-sm font-medium text-gray-500">{subject.code}</p>
                                    {subject.academic_year && (
                                        <span className="text-xs text-gray-400 border-l pl-4 border-gray-200">
                                            {subject.academic_year}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button className="flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Syllabus
                                    </button>
                                    <button className="flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                                        <Download className="w-4 h-4 mr-2" />
                                        Materials
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
