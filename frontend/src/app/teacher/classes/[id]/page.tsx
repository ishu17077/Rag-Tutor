'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Users, Search, Mail, Hash, FileText, X, Brain, Upload, Trash2, CheckCircle2, Clock, BookOpenCheck } from 'lucide-react';


interface Student {
    id: number;
    name: string;
    email: string;
    roll_number: string;
}



interface StudyMaterialPDF {
    id: number;
    file_name: string;
    file_size: number;
    is_indexed: boolean;
    indexed_at: string | null;
    created_at: string;
}

export default function ClassDetails({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;

    const [students, setStudents] = useState<Student[]>([]);

    const [pdfs, setPdfs] = useState<StudyMaterialPDF[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'students' | 'notes'>('students');
    const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] = useState(false);
    const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [deletingPdfId, setDeletingPdfId] = useState<number | null>(null);

    useEffect(() => {
        if (id) {
            fetchStudents();
            fetchPdfs();
        }
    }, [id]);

    const fetchStudents = async () => {
        try {
            const response = await api.get(`/api/teacher/classes/${id}/students`);
            setStudents(response.data);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };



    const fetchPdfs = async () => {
        try {
            const response = await api.get(`/api/teacher/classes/${id}/pdfs`);
            setPdfs(response.data);
        } catch (error) {
            console.error('Failed to fetch study material PDFs:', error);
        }
    };



    const handlePdfUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPdfFile) return;

        setPdfUploading(true);
        const formData = new FormData();
        formData.append('file', newPdfFile);

        try {
            const response = await api.post(`/api/teacher/classes/${id}/pdfs`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setNewPdfFile(null);
            setIsPdfUploadModalOpen(false);
            fetchPdfs();
            if (response.data.is_indexed) {
                alert('✅ PDF uploaded and indexed successfully! Students can now ask AI about this content.');
            } else {
                alert('⚠️ PDF uploaded but indexing failed. The content may not be available for AI queries.');
            }
        } catch (error) {
            console.error('Failed to upload PDF:', error);
            alert('Failed to upload PDF');
        } finally {
            setPdfUploading(false);
        }
    };

    const handleDeletePdf = async (pdfId: number) => {
        if (!confirm('Are you sure you want to delete this study material? Students will no longer be able to ask AI about its content.')) return;

        setDeletingPdfId(pdfId);
        try {
            await api.delete(`/api/teacher/classes/${id}/pdfs/${pdfId}`);
            fetchPdfs();
        } catch (error) {
            console.error('Failed to delete PDF:', error);
            alert('Failed to delete PDF');
        } finally {
            setDeletingPdfId(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Classes
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Class Details</h1>
                </div>
                {activeTab === 'notes' && (
                    <button
                        onClick={() => setIsPdfUploadModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload PDF for AI</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'students'
                                ? 'border-teacher-primary text-teacher-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Students ({students.length})
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'notes'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Class Notes ({pdfs.length})
                        </span>
                    </button>
                </nav>
            </div>

            {activeTab === 'students' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or roll number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teacher-primary/20 focus:border-teacher-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left max-w-full">
                            <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Student Name</th>
                                    <th className="px-6 py-4">Roll Number</th>
                                    <th className="px-6 py-4">Email Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <Users className="h-8 w-8 mb-2 opacity-50" />
                                                <p>No students found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-teacher-primary/10 text-teacher-primary flex items-center justify-center font-bold text-xs mr-3">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-gray-800">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-gray-600">
                                                    <Hash className="w-3 h-3 mr-2 text-gray-400" />
                                                    <span className="font-mono text-sm">{student.roll_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-gray-600">
                                                    <Mail className="w-3 h-3 mr-2 text-gray-400" />
                                                    <span>{student.email}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Class Notes Tab */
                <div className="space-y-4">
                    {/* Info Banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                <BookOpenCheck className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-purple-900 text-sm">AI-Powered Study Materials</h3>
                                <p className="text-purple-700 text-xs mt-1">
                                    Upload PDF notes here to power the AI Tutor for your students. The AI will analyze these PDFs and answer student questions based on the content. If a topic isn't covered in the uploaded materials, the AI will let students know.
                                </p>
                            </div>
                        </div>
                    </div>

                    {pdfs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Brain className="h-12 w-12 mx-auto text-purple-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No class notes uploaded</h3>
                            <p className="text-gray-500 mt-1 text-sm">Upload PDFs to enable AI-powered tutoring for your students</p>
                            <button
                                onClick={() => setIsPdfUploadModalOpen(true)}
                                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                            >
                                Upload First PDF
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pdfs.map((pdf) => (
                                <div key={pdf.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div className={`p-2 rounded-lg shrink-0 ${pdf.is_indexed ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                                <FileText className={`w-6 h-6 ${pdf.is_indexed ? 'text-green-600' : 'text-yellow-600'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-medium text-gray-800 truncate" title={pdf.file_name}>
                                                    {pdf.file_name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-400">
                                                        {formatFileSize(pdf.file_size)}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(pdf.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeletePdf(pdf.id)}
                                            disabled={deletingPdfId === pdf.id}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 disabled:opacity-50"
                                            title="Delete"
                                        >
                                            {deletingPdfId === pdf.id ? (
                                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        {pdf.is_indexed ? (
                                            <div className="flex items-center text-green-600 text-xs font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                Indexed for AI — Students can ask about this
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-yellow-600 text-xs font-medium">
                                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                Indexing pending — Not available for AI yet
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Upload PDF for AI Modal */}
            {isPdfUploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Brain className="w-5 h-5 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Upload Class Note (PDF)</h2>
                            </div>
                            <button
                                onClick={() => setIsPdfUploadModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-5">
                            <p className="text-purple-700 text-xs">
                                📚 This PDF will be analyzed by AI. Students will be able to ask questions and get answers from this material.
                            </p>
                        </div>

                        <form onSubmit={handlePdfUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    PDF File
                                </label>
                                <div className="border-2 border-dashed border-purple-200 rounded-lg p-6 hover:border-purple-400 transition-colors bg-purple-50/50">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setNewPdfFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="pdf-file"
                                        required
                                    />
                                    <label
                                        htmlFor="pdf-file"
                                        className="flex flex-col items-center cursor-pointer"
                                    >
                                        <Upload className="w-8 h-8 text-purple-400 mb-2" />
                                        <span className="text-sm text-gray-600 font-medium">
                                            {newPdfFile ? newPdfFile.name : 'Click to select PDF'}
                                        </span>
                                        <span className="text-xs text-gray-400 mt-1">
                                            Only PDF files (max 50MB)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsPdfUploadModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={pdfUploading || !newPdfFile}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md"
                                >
                                    {pdfUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                            Uploading & Indexing...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-4 h-4 mr-2" />
                                            Upload & Index
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
