'use client';

import { User, Mail, Phone, Building2, Calendar, Briefcase, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface TeacherProfileData {
    user: {
        full_name: string;
        email: string;
        phone: string | null;
    };
    employee_id: string;
    department: { name: string; code: string };
    designation: string;
    joining_date: string;
}

export default function TeacherProfile() {
    const { data: profile, isLoading: loading } = useSWR<TeacherProfileData>('/api/teacher/profile', fetcher);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
                <h3 className="text-red-800 font-medium text-lg mb-2">Failed to load profile</h3>
                <p className="text-red-600">Please check your internet connection or try logging in again.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-teacher-primary/10 rounded-full flex items-center justify-center text-4xl font-bold text-teacher-primary">
                    {profile.user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-center md:text-left">
                    <h1 className="text-2xl font-bold text-gray-800">{profile.user.full_name}</h1>
                    <p className="text-gray-500 font-medium">{profile.designation}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {profile.department.name}
                        </span>
                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {profile.user.email}
                        </span>
                        {profile.user.phone && (
                            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full">
                                <Phone className="w-4 h-4 text-gray-400" />
                                {profile.user.phone}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-teacher-primary" />
                        Professional Info
                    </h2>
                    <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Employee ID</span>
                            <span className="font-medium text-gray-800">{profile.employee_id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Department</span>
                            <span className="font-medium text-gray-800">{profile.department.name} ({profile.department.code})</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Designation</span>
                            <span className="font-medium text-gray-800">{profile.designation}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teacher-primary" />
                        Timeline
                    </h2>
                    <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Joining Date</span>
                            <span className="font-medium text-gray-800">{new Date(profile.joining_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Account Status</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active Faculty
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
