'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useSWR, { SWRConfig } from 'swr';
import { fetcher } from '@/lib/api';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    GraduationCap,
    Settings,
    Building2,
    Calendar,
    UserCheck,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { getUser, logout } from '@/lib/api';

interface SidebarLink {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const adminLinks: SidebarLink[] = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/admin/degrees', label: 'Degrees', icon: <GraduationCap className="w-5 h-5" /> },
    { href: '/admin/departments', label: 'Departments', icon: <Building2 className="w-5 h-5" /> },
    { href: '/admin/semesters', label: 'Semesters', icon: <Calendar className="w-5 h-5" /> },
    { href: '/admin/subjects', label: 'Subjects', icon: <BookOpen className="w-5 h-5" /> },
    { href: '/admin/teachers', label: 'Teachers', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/students', label: 'Students', icon: <UserCheck className="w-5 h-5" /> },
    { href: '/admin/allocations', label: 'Allocations', icon: <Settings className="w-5 h-5" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'admin') {
            router.push('/');
            return;
        }
        setUser(currentUser);
    }, [router]);

    // Fast navigation prefetch map
    const endpointsMap: Record<string, string[]> = {
        '/admin': ['/api/admin/users', '/api/admin/settings', '/api/admin/subjects'],
        '/admin/degrees': ['/api/admin/degrees'],
        '/admin/departments': ['/api/admin/departments'],
        '/admin/semesters': ['/api/admin/semesters'],
        '/admin/subjects': ['/api/admin/subjects', '/api/admin/degrees', '/api/admin/departments', '/api/admin/semesters'],
        '/admin/teachers': ['/api/admin/teachers-full', '/api/admin/departments'],
        '/admin/students': ['/api/admin/students-full', '/api/admin/degrees', '/api/admin/semesters'],
        '/admin/allocations': ['/api/admin/allocations', '/api/admin/teachers-full', '/api/admin/subjects']
    };

    // Eager preload core functional endpoints
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        // Ensure ultra-fast primary dashboard load by making it non-blocking
        setTimeout(() => {
            // First Priority: Dashboard Data
            const dashboardEndpoints = endpointsMap['/admin'];
            Promise.all(dashboardEndpoints.map(endpoint => fetcher(endpoint))).catch(() => { });

            // Next Priority: Trigger parallel background prefetching of all other core views
            setTimeout(() => {
                const otherEndpoints = Object.values(endpointsMap).flat().filter(e => !dashboardEndpoints.includes(e));
                const uniqueEndpoints = otherEndpoints.filter((item, pos) => otherEndpoints.indexOf(item) === pos);

                Promise.all(uniqueEndpoints.map(endpoint => fetcher(endpoint))).catch(() => { });
            }, 50); // Just enough to let the dashboard grab network priority
        }, 0);
    }, [user]);

    const handlePrefetch = (href: string) => {
        const endpoints = endpointsMap[href];
        if (endpoints) {
            endpoints.forEach(endpoint => {
                fetcher(endpoint).catch(() => { });
            });
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        );
    }

    return (
        <SWRConfig
            value={{
                fetcher,
                keepPreviousData: true,
                revalidateOnFocus: false, // Less aggressive polling to save DB load
                dedupingInterval: 10000 // Cache for 10 seconds before hitting network again
            }}
        >
            <div className="min-h-screen bg-admin-bg flex">
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
                                <div className="w-10 h-10 bg-admin-primary rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <span className="font-bold text-gray-800">RAG Tutor</span>
                                    <span className="block text-xs text-admin-muted">Admin Panel</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {adminLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setSidebarOpen(false)}
                                    onMouseEnter={() => handlePrefetch(link.href)}
                                    onTouchStart={() => handlePrefetch(link.href)}
                                    className={`sidebar-link ${pathname === link.href ? 'active admin' : ''}`}
                                >
                                    {link.icon}
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>

                        {/* User info */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-admin-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-admin-primary font-medium">
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
