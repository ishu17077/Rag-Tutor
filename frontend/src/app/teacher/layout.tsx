'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    ClipboardList,
    FileText,
    BarChart3,
    MessageSquare,
    User,
    LogOut,
    Menu,
    X,
    GraduationCap
} from 'lucide-react';
import { getUser, logout } from '@/lib/api';

import { preload, SWRConfig } from 'swr';
import { fetcher } from '@/lib/api';

interface SidebarLink {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const teacherLinks: SidebarLink[] = [
    { href: '/teacher', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/teacher/classes', label: 'My Classes', icon: <Users className="w-5 h-5" /> },
    { href: '/teacher/quizzes', label: 'Quizzes', icon: <ClipboardList className="w-5 h-5" /> },
    { href: '/teacher/assignments', label: 'Assignments', icon: <FileText className="w-5 h-5" /> },
    { href: '/teacher/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { href: '/teacher/chat', label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
    { href: '/teacher/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'teacher') {
            router.push('/');
            return;
        }
        setUser(currentUser);
    }, [router]);

    // Fast navigation prefetch map
    const endpointsMap: Record<string, string[]> = {
        '/teacher': ['/api/teacher/dashboard'],
        '/teacher/classes': ['/api/teacher/classes'],
        '/teacher/quizzes': ['/api/quizzes/teacher'],
        '/teacher/assignments': ['/api/assignments/teacher'],
        '/teacher/chat': ['/api/chat/conversations'],
        '/teacher/profile': ['/api/teacher/profile']
    };

    // Ultra-Fast Pipelined Eager Preloading
    useEffect(() => {
        if (user && user.role === 'teacher') {
            // 1. Fire Dashboard request instantly to grab highest network priority
            preload('/api/teacher/dashboard', fetcher);

            // 2. Fire the rest of the requests on the next event loop tick
            setTimeout(() => {
                const otherEndpoints = Object.values(endpointsMap)
                    .flat()
                    .filter(endpoint => endpoint !== '/api/teacher/dashboard');

                otherEndpoints.forEach(endpoint => {
                    preload(endpoint, fetcher);
                });
            }, 50);
        }
    }, [user]);

    const handlePrefetch = (href: string) => {
        const endpoints = endpointsMap[href];
        if (endpoints) {
            endpoints.forEach(endpoint => preload(endpoint, fetcher));
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-teacher-bg">
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        );
    }

    return (
        <SWRConfig value={{
            keepPreviousData: true,
            revalidateOnFocus: false, // Prevents sudden loading spinners on tab switch
            revalidateIfStale: false,
            dedupingInterval: 10000 // Reduces repeated network requests within 10s
        }}>
            <div className="min-h-screen bg-teacher-bg flex">
                {/* Mobile menu button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
                >
                    {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {/* Sidebar */}
                <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                    <div className="flex flex-col h-full">
                        {/* Logo */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-teacher-primary rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <span className="font-bold text-gray-800">RAG Tutor</span>
                                    <span className="block text-xs text-teacher-muted">Teacher Portal</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {teacherLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onMouseEnter={() => handlePrefetch(link.href)}
                                    onTouchStart={() => handlePrefetch(link.href)}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`sidebar-link ${pathname === link.href ? 'active teacher' : ''}`}
                                >
                                    {link.icon}
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>

                        {/* User info */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-teacher-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-teacher-primary font-medium">
                                        {user.full_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <main className="flex-1 p-6 lg:p-8 overflow-auto">
                    {children}
                </main>
            </div>
        </SWRConfig>
    );
}
