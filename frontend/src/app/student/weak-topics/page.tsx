'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Target, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';

interface WeakTopic {
    id: number;
    subject_id: number;
    topic_name: string;
    weakness_score: number;
    source: string;
    quiz_error_count: number;
    ai_doubt_count: number;
}

export default function WeakTopics() {
    const { data: topicsData, isLoading: loading } = useSWR<WeakTopic[]>('/api/student/weak-topics', fetcher);
    const topics = topicsData || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-student-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Weak Topics Analysis</h1>

            {topics.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="mx-auto h-16 w-16 text-green-400 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <TrendingUp className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">You're doing great!</h3>
                    <p className="mt-2 text-gray-500">No weak topics identified yet. Keep up the good work!</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {topics.map((topic) => (
                        <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                    <Target className="w-6 h-6" />
                                </div>
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                    Score: {topic.weakness_score}/100
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-1">{topic.topic_name}</h3>

                            <div className="space-y-3 mt-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                                    Quiz Errors: <span className="font-medium ml-1">{topic.quiz_error_count}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                                    AI Doubts: <span className="font-medium ml-1">{topic.ai_doubt_count}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <span className="text-gray-400 mr-2">Source:</span>
                                    <span className="font-medium capitalize">{topic.source.toLowerCase().replace('_', ' ')}</span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${Math.min(topic.weakness_score, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-right text-gray-500 mt-1">Severity Indicator</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
