'use client';

import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Send, User, MessageSquare, Paperclip, X } from 'lucide-react';
import api from '@/lib/api';

interface Conversation {
    id: number;
    participant_name: string;
    participant_email: string;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
}

interface Message {
    id: number;
    sender_role: string;
    message: string;
    file_path?: string;
    is_urgent: boolean;
    created_at: string;
    is_read: boolean;
}

export default function StudentChat() {
    const searchParams = useSearchParams();
    const initialConvId = searchParams.get('id');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<number | null>(initialConvId ? parseInt(initialConvId) : null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
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

    const { data: conversationsData } = useSWR<Conversation[]>('/api/chat/conversations', fetcher);
    const { data: messagesData } = useSWR<Message[]>(
        activeConversation ? `/api/chat/conversations/${activeConversation}/messages` : null,
        fetcher
    );

    useEffect(() => {
        if (conversationsData) {
            setConversations(conversationsData);
            setLoading(false);
        }
    }, [conversationsData]);

    useEffect(() => {
        if (messagesData) {
            setMessages(messagesData);
        }
    }, [messagesData]);

    useEffect(() => {
        if (activeConversation) {
            setConversations(prev => prev.map(c =>
                c.id === activeConversation ? { ...c, unread_count: 0 } : c
            ));
        }
    }, [activeConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !activeConversation) return;

        try {
            const payload: any = {
                message: newMessage || '📎 Attachment',
                is_urgent: false
            };

            if (selectedFile) {
                payload.file_name = selectedFile.name;
                payload.file_bytes = await toBase64(selectedFile);
            }

            const response = await api.post(`/api/chat/conversations/${activeConversation}/messages`, payload);
            console.log(response.data)
            setMessages([...messages, { ...response.data, sender_role: 'student' }]);
            setNewMessage('');
            setSelectedFile(null);

            setConversations(prev => prev.map(c =>
                c.id === activeConversation ? {
                    ...c,
                    last_message: response.data.message,
                    last_message_at: response.data.created_at
                } : c
            ));
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const selectedConv = conversations.find(c => c.id === activeConversation);

    // Helper function to robustly check if a file is an image
    const isImageFile = (url?: string, type?: string) => {
        if (!url) return false;
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (type && imageExtensions.includes(type.toLowerCase())) return true;
        const ext = url.split('.').pop()?.toLowerCase();
        return imageExtensions.includes(ext || '');
    };

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
        <div className="h-[calc(100vh-120px)] flex gap-6">
            {/* Sidebar - Conversations List */}
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No conversations yet.</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setActiveConversation(conv.id)}
                                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${activeConversation === conv.id ? 'bg-blue-50/50 border-l-4 border-l-student-primary' : 'border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-gray-800 text-sm">{conv.participant_name}</span>
                                    {conv.last_message_at && (
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(conv.last_message_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                        {conv.last_message || 'No messages yet'}
                                    </p>
                                    {conv.unread_count > 0 && (
                                        <span className="bg-student-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{selectedConv?.participant_name || 'Loading...'}</h3>
                                <p className="text-xs text-gray-500">{selectedConv?.participant_email}</p>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {messages.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p>Start the conversation with {selectedConv?.participant_name}</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_role === 'student';
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                                ? 'bg-student-primary text-white rounded-tr-sm'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                                                }`}>

                                                {/* CONDITIONAL RENDERING: Hide the placeholder text if an image is sent without typing */}
                                                {msg.message && msg.message !== '📎 Attachment' && (
                                                    <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                                                )}

                                                {msg.file_path && (
                                                    <div className={`${msg.message && msg.message !== '📎 Attachment' ? 'mt-2' : ''} text-left`}>
                                                        {isImageFile(msg.file_path, msg.file_path.split(".").at(-1)) ? (
                                                            <a href={`${msg.file_path}`} target="_blank" rel="noreferrer">
                                                                <img src={`/${msg.file_path}`} alt="attachment" className="max-w-xs rounded-lg shadow-sm w-full object-cover max-h-48" />
                                                            </a>
                                                        ) : (
                                                            <a href={`/${msg.file_path}`} target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded-lg transition ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-black/5 hover:bg-black/10 text-gray-700'}`}>
                                                                <Paperclip className="w-4 h-4" />
                                                                {msg.file_path ? `Download ${msg.file_path.toUpperCase()}` : 'Download Attachment'}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white relative">
                            {selectedFile && (
                                <div className="absolute -top-12 left-4 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-sm z-10">
                                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="max-w-[150px] truncate text-gray-700 font-medium">{selectedFile.name}</span>
                                    <button type="button" onClick={() => setSelectedFile(null)} className="hover:text-red-500 ml-1 bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center">
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-400 hover:text-student-primary hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-student-primary/20 focus:border-student-primary"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() && !selectedFile}
                                    className="p-2 bg-student-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}