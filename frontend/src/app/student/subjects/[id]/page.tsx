'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import {
    ArrowLeft, FileText, Download, User, BookOpen, Clock, File, Eye, X,
    MessageSquare, Loader2, Send, Bot, ChevronRight, Sparkles, ClipboardPaste
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface SubjectDetail {
    id: number;
    name: string;
    code: string;
    credits: number;
    teacher: {
        id: number;
        name: string;
        email: string;
    } | null;
}

interface ClassNote {
    id: number;
    title: string;
    file_url: string;
    uploaded_at: string;
}

interface AiMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function SubjectDetails({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;

    const { data: subjectData, isLoading: loadingSubject } = useSWR<SubjectDetail>(id ? `/api/student/subjects/${id}` : null, fetcher);
    const { data: notesData, isLoading: loadingNotes } = useSWR<ClassNote[]>(id ? `/api/student/subjects/${id}/notes` : null, fetcher);

    const subject = subjectData || null;
    const notes = notesData || [];
    const loading = loadingSubject || loadingNotes;

    const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

    // Copilot panel state
    const [copilotOpen, setCopilotOpen] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [chatMessages, setChatMessages] = useState<AiMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Resize state
    const [pdfWidthPercent, setPdfWidthPercent] = useState(60);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isChatLoading]);

    // Drag handlers for resize
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            let percent = (x / rect.width) * 100;
            // Clamp between 30% and 80%
            percent = Math.max(30, Math.min(80, percent));
            setPdfWidthPercent(percent);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isDragging]);

    const openCopilot = () => {
        setCopilotOpen(true);
        if (chatMessages.length === 0 && subject) {
            setChatMessages([{
                role: 'assistant',
                content: `Hi! I'm your AI Tutor for **${subject.name}**.\n\n📋 **Tip:** Select text in the PDF, press **Ctrl+C** to copy, then click the **Paste & Ask** button below — I'll explain it for you!\n\nOr just type your own question.`
            }]);
        }
        setTimeout(() => inputRef.current?.focus(), 200);
    };

    const closePdf = () => {
        setSelectedPdf(null);
        setCopilotOpen(false);
    };

    const handleSendMessage = async (overrideText?: string) => {
        const text = overrideText || chatInput.trim();
        if (!text || isChatLoading) return;

        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsChatLoading(true);

        try {
            const response = await api.post('/api/ai/chat', {
                subject_id: Number(id),
                question: text,
                session_id: sessionId
            });

            if (!sessionId && response.data.session_id) {
                setSessionId(response.data.session_id);
            }

            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.answer
            }]);
        } catch (error: any) {
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: error.response?.data?.detail || "Sorry, I couldn't process your request. Please try again."
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handlePasteAndAsk = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().length > 0) {
                const question = `Explain this from the document:\n\n"${text.trim()}"`;
                handleSendMessage(question);
            } else {
                alert("Your clipboard is empty. Please copy some text from the PDF first (Ctrl+C).");
            }
        } catch {
            // Clipboard API blocked — fallback to prompt
            const text = prompt("Paste the text you want explained:");
            if (text && text.trim().length > 0) {
                const question = `Explain this from the document:\n\n"${text.trim()}"`;
                handleSendMessage(question);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-student-primary"></div>
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-800">Subject not found</h2>
                <button onClick={() => router.back()} className="mt-4 text-student-primary hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    const getDownloadUrl = (url: string) => {
        if (!url) return '#';
        if (url.startsWith('http')) return url;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            return `${apiUrl}${cleanPath}`;
        }
        const cleanPath = url.startsWith('/') ? url.slice(1) : url;
        return `${apiUrl}/uploads/${cleanPath}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
                <button
                    onClick={() => router.back()}
                    className="relative z-10 flex items-center text-gray-500 hover:text-student-primary mb-6 transition-colors font-medium text-sm group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
                    Back to All Subjects
                </button>
                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                                {subject.code}
                            </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                {subject.credits} Credits
                            </span>
                            {subject.teacher && (
                                <div className="flex items-center gap-2 bg-gray-50 py-1 px-3 rounded-full border border-gray-100">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-gray-700">{subject.teacher.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg"><FileText className="w-5 h-5 text-indigo-600" /></div>
                    <span>Class Notes & Resources</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No notes available</h3>
                            <p className="text-gray-500">The teacher hasn't uploaded any resources yet.</p>
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div key={note.id} className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-student-primary/30 transition-all duration-300 flex flex-col justify-between h-full">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-student-primary group-hover:text-white transition-colors duration-300">
                                        <File className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-student-primary transition-colors" title={note.title}>
                                            {note.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{new Date(note.uploaded_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full mt-2">
                                    <button
                                        onClick={() => { setSelectedPdf(getDownloadUrl(note.file_url)); setCopilotOpen(false); setSessionId(null); setChatMessages([]); }}
                                        className="flex-1 flex items-center justify-center py-2.5 px-4 bg-student-primary text-white rounded-xl hover:bg-opacity-90 font-medium text-sm transition-all duration-300 gap-2 shadow-sm group/btn"
                                    >
                                        <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                        <span>View</span>
                                    </button>
                                    <a
                                        href={getDownloadUrl(note.file_url)}
                                        target="_blank" rel="noopener noreferrer" download
                                        className="flex items-center justify-center px-4 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-student-primary font-medium transition-all duration-300 border border-gray-200"
                                        title="Download"
                                    >
                                        <Download className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ====================== FULLSCREEN PDF VIEWER + COPILOT ====================== */}
            {selectedPdf && (
                <div className="fixed inset-0 z-50 bg-[#111827] flex flex-col">
                    {/* === Top Toolbar === */}
                    <div className="h-12 bg-[#1e2536] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-white/80 text-sm font-medium truncate">
                                {notes.find(n => getDownloadUrl(n.file_url) === selectedPdf)?.title || 'Document'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => copilotOpen ? setCopilotOpen(false) : openCopilot()}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${copilotOpen
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                                    : 'bg-white/10 text-white/90 hover:bg-indigo-600 hover:text-white'
                                    }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                {copilotOpen ? 'Hide AI' : 'Ask AI'}
                            </button>
                            <button
                                onClick={closePdf}
                                className="bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white rounded-lg p-1.5 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* === Main Area: PDF left, Copilot right === */}
                    <div ref={containerRef} className="flex flex-1 min-h-0 relative">
                        {/* Drag overlay to prevent iframe stealing mouse events */}
                        {isDragging && (
                            <div className="absolute inset-0 z-30 cursor-col-resize" />
                        )}

                        {/* PDF Column */}
                        <div
                            className="bg-white min-h-0"
                            style={{ width: copilotOpen ? `${pdfWidthPercent}%` : '100%' }}
                        >
                            {selectedPdf.endsWith('.pdf') ? (
                                <iframe
                                    src={selectedPdf}
                                    className="w-full h-full border-0"
                                    title="PDF Viewer"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-gray-50">
                                    <div className="text-center">
                                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-gray-700 mb-2">Preview Not Available</h3>
                                        <p className="text-gray-500 mb-6">This file type cannot be previewed.</p>
                                        <a href={selectedPdf} target="_blank" rel="noopener noreferrer" download
                                            className="inline-flex items-center gap-2 bg-student-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-opacity-90 transition"
                                        >
                                            <Download className="w-5 h-5" /> Download
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Resize Handle */}
                        {copilotOpen && (
                            <div
                                onMouseDown={handleMouseDown}
                                className={`w-2 flex-shrink-0 cursor-col-resize relative z-20 group flex items-center justify-center transition-colors ${isDragging
                                        ? 'bg-indigo-500'
                                        : 'bg-[#1a2030] hover:bg-indigo-500/60'
                                    }`}
                            >
                                {/* Drag dots */}
                                <div className="flex flex-col gap-1">
                                    <span className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-white/30 group-hover:bg-white/80'}`}></span>
                                    <span className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-white/30 group-hover:bg-white/80'}`}></span>
                                    <span className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-white/30 group-hover:bg-white/80'}`}></span>
                                    <span className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-white/30 group-hover:bg-white/80'}`}></span>
                                    <span className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-white/30 group-hover:bg-white/80'}`}></span>
                                </div>
                            </div>
                        )}

                        {/* Copilot Column */}
                        {copilotOpen && (
                            <div
                                className="flex flex-col min-h-0 bg-[#0d1117]"
                                style={{ width: `${100 - pdfWidthPercent}%` }}
                            >
                                {/* Copilot Header */}
                                <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 bg-gradient-to-r from-indigo-950/60 to-purple-950/40">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-bold text-sm leading-tight">AI Tutor</h3>
                                            <p className="text-indigo-300/80 text-xs truncate">{subject.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            <span className="text-emerald-300/80 text-xs font-medium">Active</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Scrollable Container */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.map((msg, index) => (
                                        <div key={index} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                                                    <Bot className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-md'
                                                : 'bg-white/[0.07] text-gray-200 rounded-bl-md border border-white/[0.08]'
                                                }`}>
                                                {msg.role === 'assistant' ? (
                                                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:text-indigo-200 prose-strong:text-white prose-code:text-indigo-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
                                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {isChatLoading && (
                                        <div className="flex gap-2 justify-start">
                                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                                                <Bot className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div className="bg-white/[0.07] border border-white/[0.08] rounded-2xl rounded-bl-md px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Prompts — only when first opened */}
                                {chatMessages.length === 1 && !isChatLoading && (
                                    <div className="px-4 pb-2 flex flex-col gap-1.5 flex-shrink-0">
                                        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-1">Quick prompts</p>
                                        {[
                                            "Summarize the key topics in this document",
                                            "Explain the main concepts in simple terms",
                                            "What should I focus on for the exam?"
                                        ].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => handleSendMessage(s)}
                                                className="text-left text-xs text-indigo-300/90 bg-indigo-900/25 border border-indigo-700/30 rounded-lg px-3 py-2 hover:bg-indigo-800/40 transition-colors flex items-center gap-2 group"
                                            >
                                                <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 transition" />
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Input Area */}
                                <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-2">
                                    {/* Paste & Ask button */}
                                    <button
                                        onClick={handlePasteAndAsk}
                                        disabled={isChatLoading}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 text-xs font-semibold hover:from-amber-500/30 hover:to-orange-500/30 transition-all disabled:opacity-40"
                                    >
                                        <ClipboardPaste className="w-3.5 h-3.5" />
                                        Paste & Ask — Select text in PDF, copy (Ctrl+C), then click here
                                    </button>

                                    {/* Text input */}
                                    <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Or type your question..."
                                            className="flex-1 bg-transparent text-white placeholder-white/25 text-sm focus:outline-none py-1.5"
                                            disabled={isChatLoading}
                                        />
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={!chatInput.trim() || isChatLoading}
                                            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
                                        >
                                            <Send className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                    <p className="text-center text-[10px] text-white/15 mt-1">Answers based on your subject materials</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
