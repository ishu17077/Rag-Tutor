'use client';

import { useEffect, useState, useRef } from 'react';
import { Brain, Send, BookOpen, AlertCircle, RefreshCcw, Paperclip, X } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import api from '@/lib/api';

interface Subject {
    id: number;
    name: string;
    code: string;
    has_pdfs: boolean;
    pdf_count: number;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    file_url?: string;
    file_type?: string;
    citations?: string[];
}

interface AIStatus {
    exam_mode: boolean;
    message: string;
}

export default function AITutorPage() {
    const { data: aiStatus } = useSWR<AIStatus>('/api/ai/status', fetcher);
    const { data: subjectsData } = useSWR<Subject[]>('/api/ai/subjects', fetcher);
    const subjects = subjectsData || [];

    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 10, limited: false });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
            if ((encoded.length % 4) > 0) {
                encoded += '='.repeat(4 - (encoded.length % 4));
            }
            resolve(encoded);
        };
        reader.onerror = error => reject(error);
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchRateLimit = async () => {
        try {
            const response = await api.get('/api/ai/rate-limit');
            setRateLimitInfo({
                remaining: response.data.queries_remaining,
                limited: response.data.is_limited
            });
        } catch (error) {
            console.error('Failed to fetch rate limit:', error);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedFile) || !selectedSubject || loading) return;

        // Optimistic UI update
        const userMessage: Message = {
            role: 'user',
            content: input || '📎 Attachment',
            file_url: selectedFile ? URL.createObjectURL(selectedFile) : undefined,
            file_type: selectedFile ? selectedFile.name.split('.').pop()?.toLowerCase() : undefined
        };
        setMessages(prev => [...prev, userMessage]);

        const payload: any = {
            subject_id: selectedSubject.id,
            question: input || '📎 Attachment',
            session_id: sessionId
        };

        if (selectedFile) {
            payload.file_name = selectedFile.name;
            payload.file_bytes = await toBase64(selectedFile);
        }

        setInput('');
        setSelectedFile(null);
        setLoading(true);

        try {
            const response = await api.post('/api/ai/chat', payload);

            const aiMessage: Message = {
                role: 'assistant',
                content: response.data.answer,
                citations: response.data.citations
            };

            setMessages(prev => [...prev, aiMessage]);
            setSessionId(response.data.session_id);
            fetchRateLimit();
        } catch (error: any) {
            if (error.response?.status === 429) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ Rate limit exceeded. Please wait a moment before asking another question.'
                }]);
            } else if (error.response?.status === 403) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '🚫 AI Tutor is currently disabled during the examination period.'
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.'
                }]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectSubject = (subject: Subject) => {
        setSelectedSubject(subject);
        setMessages([]);
        setSessionId(null);
        fetchRateLimit();
    };

    // Exam mode check
    if (aiStatus?.exam_mode) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Tutor Unavailable</h2>
                    <p className="text-gray-600">
                        The AI Tutor is temporarily disabled during the examination period to maintain academic integrity.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        You can still use the Chat feature to contact your teachers.
                    </p>
                </div>
            </div>
        );
    }

    // Subject selection
    if (!selectedSubject) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">AI Tutor</h1>
                    <p className="text-gray-500 mt-1">Select a subject to start learning</p>
                </div>

                {subjects.length === 0 ? (
                    <div className="card text-center py-12">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No subjects with course materials available yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.map((subject) => (
                            <button
                                key={subject.id}
                                onClick={() => selectSubject(subject)}
                                className={`card card-hover text-left`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${subject.has_pdfs ? 'bg-student-primary/10' : 'bg-gray-100'
                                        }`}>
                                        <BookOpen className={`w-6 h-6 ${subject.has_pdfs ? 'text-student-primary' : 'text-gray-400'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-800 truncate">{subject.name}</h3>
                                        <p className="text-sm text-gray-500">{subject.code}</p>
                                        {subject.has_pdfs ? (
                                            <span className="badge-success mt-2">
                                                {subject.pdf_count} PDF{subject.pdf_count > 1 ? 's' : ''} available
                                            </span>
                                        ) : (
                                            <span className="badge-warning mt-2">No materials • General Mode</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Chat interface
    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedSubject(null)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">{selectedSubject.name}</h1>
                        <p className="text-sm text-gray-500">AI Tutor • Socratic Method</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                        {rateLimitInfo.remaining}/20 queries left
                    </span>
                    <button
                        onClick={() => {
                            setMessages([]);
                            setSessionId(null);
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="New conversation"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <Brain className="w-16 h-16 text-student-primary/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                            Ask me anything about {selectedSubject.name}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            I'll help you understand concepts using the Socratic method, guiding you with questions.
                            {!selectedSubject.has_pdfs && (
                                <span className="block mt-2 text-amber-600">
                                    Note: No course materials uploaded. Answering from general knowledge.
                                </span>
                            )}
                        </p>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div key={index} className={`ai-message ${message.role}`}>
                        <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : 'prose-gray'} break-words whitespace-pre-wrap`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                        {message.file_url && (
                            <div className="mt-2 text-left">
                                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(message.file_type || '') ? (
                                    <a href={message.file_url.startsWith('blob:') ? message.file_url : `${API_URL}/uploads/${message.file_url}`} target="_blank" rel="noreferrer">
                                        <img src={message.file_url.startsWith('blob:') ? message.file_url : `${API_URL}/uploads/${message.file_url}`} alt="attachment" className="max-w-xs rounded-lg shadow-sm w-full object-cover max-h-48" />
                                    </a>
                                ) : (
                                    <a href={message.file_url.startsWith('blob:') ? message.file_url : `${API_URL}/uploads/${message.file_url}`} target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded-lg transition ${message.role === 'user' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-black/5 hover:bg-black/10 text-gray-700'}`}>
                                        <Paperclip className="w-4 h-4" /> Download {message.file_type?.toUpperCase()}
                                    </a>
                                )}
                            </div>
                        )}
                        {message.citations && message.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/20">
                                <p className="text-xs font-medium mb-1">📚 Sources:</p>
                                <ul className="text-xs opacity-80">
                                    {message.citations.map((citation, i) => (
                                        <li key={i}>• {citation}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="ai-message assistant">
                        <div className="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="mt-4 flex gap-3 relative">
                {selectedFile && (
                    <div className="absolute -top-12 left-0 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-sm z-10">
                        <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                        <span className="max-w-[150px] truncate text-gray-700 font-medium">{selectedFile.name}</span>
                        <button type="button" onClick={() => setSelectedFile(null)} className="hover:text-red-500 ml-1 bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                )}
                <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 items-center">
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-student-primary hover:bg-gray-50 transition-colors border-r border-gray-100"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question or upload an image..."
                        className="flex-1 px-4 py-3 focus:outline-none"
                        disabled={loading || rateLimitInfo.limited}
                    />
                </div>
                <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedFile) || loading || rateLimitInfo.limited}
                    className="btn-student px-6 flex items-center gap-2 disabled:opacity-50"
                >
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Send</span>
                </button>
            </div>
        </div>
    );
}
