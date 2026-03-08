'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useMemo } from 'react';
import { Clock, FileText, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_id: number;
    due_date: string;
    max_marks: number;
    is_overdue: boolean;
    has_submitted: boolean;
    submission_status: string | null;
    marks_obtained: number | null;
    feedback: string | null;
}

interface Subject {
    id: number;
    name: string;
    code: string;
}

export default function StudentAssignments() {
    const router = useRouter();

    const { data: assignmentsData, isLoading: loadingAssignments } = useSWR<Assignment[]>('/api/assignments/student', fetcher);
    const { data: subjectsData, isLoading: loadingSubjects } = useSWR<{ subjects: Subject[] }>('/api/student/subjects', fetcher);

    const loading = loadingAssignments || loadingSubjects;
    const assignments = assignmentsData || [];

    const subjects = useMemo(() => {
        const map: Record<number, Subject> = {};
        if (subjectsData?.subjects) {
            subjectsData.subjects.forEach(s => {
                map[s.id] = s;
            });
        }
        return map;
    }, [subjectsData]);

    const getStatusBadge = (assignment: Assignment) => {
        if (assignment.has_submitted) {
            if (assignment.submission_status === 'LATE') {
                return (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                        <AlertCircle className="w-3 h-3" />
                        Late Submitted
                    </span>
                );
            }
            if (assignment.submission_status === 'GRADED') {
                return (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Graded: {assignment.marks_obtained}/{assignment.max_marks}
                    </span>
                );
            }
            return (
                <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    <CheckCircle className="w-3 h-3" />
                    Submitted
                </span>
            );
        }
        if (assignment.is_overdue) {
            return (
                <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                    <AlertCircle className="w-3 h-3" />
                    Overdue
                </span>
            );
        }
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">Pending</span>;
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
            <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>

            {assignments.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="mx-auto h-16 w-16 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No assignments yet</h3>
                    <p className="mt-2 text-gray-500">You don&apos;t have any pending assignments.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {assignments.map((assignment) => (
                        <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-gray-800">{assignment.title}</h3>
                                        {getStatusBadge(assignment)}
                                    </div>

                                    <p className="text-gray-500 font-medium mb-3">
                                        {subjects[assignment.subject_id]?.name || 'Unknown Subject'}
                                        <span className="text-gray-400 mx-2">•</span>
                                        <span className="text-sm font-normal">{subjects[assignment.subject_id]?.code}</span>
                                    </p>

                                    {/* Explicit Status Message */}
                                    {assignment.has_submitted && (
                                        <p className="text-sm text-green-600 font-medium mb-3 flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-1.5" />
                                            Assignment Submitted Successfully
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        <div className={`flex items-center ${assignment.is_overdue && !assignment.has_submitted ? 'text-red-600 font-medium' : ''}`}>
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Due: {new Date(assignment.due_date).toLocaleDateString()} {new Date(assignment.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Max Marks: {assignment.max_marks}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/student/assignments/${assignment.id}`)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                                >
                                    {assignment.has_submitted ? 'View Submission' : 'View & Submit'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
