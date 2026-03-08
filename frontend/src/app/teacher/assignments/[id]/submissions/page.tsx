'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Download, ExternalLink, Calendar, User, Search, FileText, X, Check } from 'lucide-react';

interface Submission {
    id: number;
    assignment_id: number;
    student_id: number;
    student_name: string;
    student_roll: string;
    submission_url: string;
    submitted_at: string;
    marks_obtained: number | null;
    feedback: string | null;
    status: string;
}

export default function AssignmentSubmissions({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Grading Modal State
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [marks, setMarks] = useState<number | string>('');
    const [feedback, setFeedback] = useState('');
    const [gradingLoading, setGradingLoading] = useState(false);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await api.get(`/api/assignments/teacher/${id}/submissions`);
                setSubmissions(response.data);
            } catch (error) {
                console.error('Failed to fetch submissions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [id]);

    const filteredSubmissions = submissions.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_roll.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-blue-100 text-blue-700';
            case 'graded': return 'bg-green-100 text-green-700';
            case 'late': return 'bg-yellow-100 text-yellow-700';
            case 'resubmit': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getDownloadUrl = (url: string) => {
        if (!url) return '#';
        if (url.startsWith('http')) return url;

        // Use environment variable or fallback to localhost
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // If the URL already contains /uploads, just prepend the API URL
        if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            return `${apiUrl}${cleanPath}`;
        }

        // Otherwise, prepend /uploads
        const cleanPath = url.startsWith('/') ? url.slice(1) : url;
        return `${apiUrl}/uploads/${cleanPath}`;
    };

    const openGradingModal = (submission: Submission) => {
        setSelectedSubmission(submission);
        setMarks(submission.marks_obtained || '');
        setFeedback(submission.feedback || '');
    };

    const closeGradingModal = () => {
        setSelectedSubmission(null);
        setMarks('');
        setFeedback('');
    };

    const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubmission) return;

        setGradingLoading(true);
        try {
            await api.patch(`/api/assignments/teacher/submissions/${selectedSubmission.id}/grade`, {
                marks_obtained: Number(marks),
                feedback: feedback,
                status: 'graded'
            });

            // Update local state
            setSubmissions(submissions.map(s =>
                s.id === selectedSubmission.id
                    ? { ...s, marks_obtained: Number(marks), feedback, status: 'graded' }
                    : s
            ));

            closeGradingModal();
            // Optional: Show success toast
        } catch (error) {
            console.error('Failed to grade submission:', error);
            alert('Failed to submit grade. Please try again.');
        } finally {
            setGradingLoading(false);
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
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Assignments
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Submissions</h1>
                    <p className="text-gray-500 mt-1">View and grade student submissions</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by student name or roll number..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teacher-primary/20 focus:border-teacher-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Submitted At</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Marks</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText className="w-8 h-8 text-gray-300 mb-2" />
                                            <p>No submissions found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSubmissions.map((submission) => (
                                    <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                                    {submission.student_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{submission.student_name}</div>
                                                    <div className="text-xs text-gray-500">{submission.student_roll}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(submission.submitted_at).toLocaleDateString()}
                                                <span className="text-gray-400 mx-1">•</span>
                                                {new Date(submission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(submission.status)}`}>
                                                {submission.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            {submission.marks_obtained !== null ? submission.marks_obtained : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {submission.submission_url && (
                                                    <a
                                                        href={getDownloadUrl(submission.submission_url)}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Download Submission"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => openGradingModal(submission)}
                                                    className="px-3 py-1.5 bg-teacher-primary text-white text-sm rounded-lg hover:bg-opacity-90 transition-colors"
                                                >
                                                    Grade
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Grading Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Grade Submission</h3>
                            <button onClick={closeGradingModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleGradeSubmit} className="p-4 space-y-4">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Student</div>
                                <div className="font-medium text-gray-900">{selectedSubmission.student_name}</div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marks Obtained</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teacher-primary/20 focus:border-teacher-primary"
                                    value={marks}
                                    onChange={(e) => setMarks(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teacher-primary/20 focus:border-teacher-primary min-h-[100px]"
                                    placeholder="Enter feedback for the student..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeGradingModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={gradingLoading}
                                    className="flex-1 px-4 py-2 bg-teacher-primary text-white rounded-lg hover:bg-opacity-90 font-medium disabled:opacity-50 flex items-center justify-center"
                                >
                                    {gradingLoading ? 'Saving...' : 'Save Grade'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
