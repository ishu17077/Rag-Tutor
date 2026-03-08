'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { ArrowLeft, Clock, FileText, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface AssignmentDetail {
    id: number;
    title: string;
    description: string;
    subject_id: number;
    due_date: string;
    max_marks: number;
    attachment_url: string | null;
    submission: {
        id: number;
        submission_url: string;
        submitted_at: string;
        status: string;
        marks_obtained: number | null;
        feedback: string | null;
    } | null;
}

export default function StudentAssignmentDetail({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;

    const { data: assignmentData, isLoading: loading, error } = useSWR<AssignmentDetail>(id ? `/api/assignments/student/${id}` : null, fetcher);
    const assignment = assignmentData || null;

    useEffect(() => {
        if (error) {
            console.error('Failed to load assignment:', error);
            alert('Failed to load assignment details');
            router.push('/student/assignments');
        }
    }, [error, router]);

    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            alert('Please select a file to upload');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/api/assignments/student/${id}/submit`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Assignment submitted successfully!');
            // Reload to show submission state
            window.location.reload();
        } catch (error: any) {
            console.error('Submission failed:', error);
            alert(error.response?.data?.detail || 'Failed to submit assignment');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading assignment...</div>;
    if (!assignment) return <div className="p-8 text-center">Assignment not found</div>;

    const isOverdue = new Date(assignment.due_date) < new Date();
    const canSubmit = !assignment.submission || assignment.submission.status === 'RESUBMIT';

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-500 hover:text-gray-700 mb-2 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Assignments
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                <span className={`flex items-center ${isOverdue && !assignment.submission ? 'text-red-600 font-bold' : ''}`}>
                                    <Clock className="w-4 h-4 mr-1" />
                                    Due: {new Date(assignment.due_date).toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                    <FileText className="w-4 h-4 mr-1" />
                                    Max Marks: {assignment.max_marks}
                                </span>
                            </div>
                        </div>
                        {assignment.submission?.status === 'GRADED' && (
                            <div className="bg-green-50 px-4 py-3 rounded-lg border border-green-100 text-center">
                                <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Score</div>
                                <div className="text-2xl font-bold text-green-700">
                                    {assignment.submission.marks_obtained} <span className="text-sm text-green-500">/ {assignment.max_marks}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="prose max-w-none text-gray-600 mt-6">
                        <p className="whitespace-pre-wrap">{assignment.description}</p>
                    </div>

                    {assignment.attachment_url && (
                        <div className="mt-8">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Attachments</h4>
                            <a
                                href={assignment.attachment_url} // Ensure this URL is accessible or proxied correctly if local
                                download
                                className="inline-flex items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Attached File
                            </a>
                        </div>
                    )}
                </div>

                {/* Submission Section */}
                <div className="bg-gray-50 p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Your Submission</h3>

                    {assignment.submission ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                                <div>
                                    <div className="font-medium text-gray-900">Submitted on {new Date(assignment.submission.submitted_at).toLocaleString()}</div>
                                    <div className="text-sm text-gray-500">Status: {assignment.submission.status}</div>
                                </div>
                            </div>

                            {assignment.submission.feedback && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h5 className="text-sm font-bold text-blue-900 mb-1">Teacher Feedback</h5>
                                    <p className="text-blue-800">{assignment.submission.feedback}</p>
                                </div>
                            )}

                            {!canSubmit && (
                                <p className="text-sm text-gray-500 text-center mt-4">
                                    Submission is locked. You can only resubmit if the teacher requests it.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300">
                            {isOverdue ? (
                                <div className="flex items-center justify-center text-red-600 mb-4">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    <span className="font-medium">Assignment is overdue. You can still submit, but it will be marked late.</span>
                                </div>
                            ) : null}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload your work</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {submitting ? 'Submitting...' : 'Submit Assignment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
