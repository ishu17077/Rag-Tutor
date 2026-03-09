'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, Users, Shield, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Login form
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });

    // Registration form
    const [regRole, setRegRole] = useState<'student' | 'teacher'>('student');
    const [registerData, setRegisterData] = useState({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        // Student specific
        roll_number: '',
        degree_id: 1,
        department_id: 1,
        semester_id: 1,
        passout_year: 2028,
        admission_year: 2024,
        // Teacher specific
        employee_id: '',
        designation: 'Assistant Professor'
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/api/auth/login', loginData);
            const { access_token, user } = response.data;

            Cookies.set('token', access_token, { expires: 1 });
            localStorage.setItem('user', JSON.stringify(user));

            switch (user.role) {
                case 'admin': router.push('/admin'); break;
                case 'student': router.push('/student'); break;
                case 'teacher': router.push('/teacher'); break;
                default: router.push('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = regRole === 'student'
                ? '/api/auth/register/student'
                : '/api/auth/register/teacher';

            await api.post(endpoint, registerData);
            setIsLogin(true);
            setError('');
            alert('Registration successful! Please login.');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">RAG Tutor</span>
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-4">
                        Academic Excellence,<br />Powered by AI
                    </h1>
                    <p className="text-slate-300 text-lg">
                        A comprehensive academic ERP system with AI-powered tutoring,
                        designed to help students learn smarter.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">AI Tutor</h3>
                            <p className="text-slate-400 text-sm">Subject-specific Socratic teaching with citations</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Direct Chat</h3>
                            <p className="text-slate-400 text-sm">Connect with teachers instantly</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Offline First</h3>
                            <p className="text-slate-400 text-sm">Pre-trained AI, fast and accurate responses.</p>
                        </div>
                    </div>
                </div>

                <p className="text-slate-500 text-sm">
                    © 2024 RAG Tutor. All rights reserved.
                </p>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-slate-800">RAG Tutor</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${isLogin
                                ? 'bg-slate-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${!isLogin
                                ? 'bg-slate-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Registration Role Toggle */}
                    {!isLogin && (
                        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                            <button
                                onClick={() => setRegRole('student')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${regRole === 'student' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                                    }`}
                            >
                                Student
                            </button>
                            <button
                                onClick={() => setRegRole('teacher')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${regRole === 'teacher' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                                    }`}
                            >
                                Teacher
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {isLogin ? (
                        // Login Form
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    className="input-admin"
                                    placeholder="you@college.edu"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        className="input-admin pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                        </form>
                    ) : (
                        // Registration Form
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={registerData.full_name}
                                        onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                                        className="input-admin"
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={registerData.email}
                                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                        className="input-admin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                        className="input-admin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={registerData.phone}
                                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                        className="input-admin"
                                    />
                                </div>

                                {regRole === 'student' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                                            <input
                                                type="text"
                                                value={registerData.roll_number}
                                                onChange={(e) => setRegisterData({ ...registerData, roll_number: e.target.value })}
                                                className="input-admin"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Passout Year</label>
                                            <input
                                                type="number"
                                                value={registerData.passout_year}
                                                onChange={(e) => setRegisterData({ ...registerData, passout_year: parseInt(e.target.value) })}
                                                className="input-admin"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Semester</label>
                                            <select
                                                value={registerData.semester_id}
                                                onChange={(e) => setRegisterData({ ...registerData, semester_id: parseInt(e.target.value) })}
                                                className="input-admin"
                                                required
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                    <option key={num} value={num}>Semester {num}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                            <input
                                                type="text"
                                                value={registerData.employee_id}
                                                onChange={(e) => setRegisterData({ ...registerData, employee_id: e.target.value })}
                                                className="input-admin"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                            <select
                                                value={registerData.designation}
                                                onChange={(e) => setRegisterData({ ...registerData, designation: e.target.value })}
                                                className="input-admin"
                                            >
                                                <option value="Assistant Professor">Assistant Professor</option>
                                                <option value="Associate Professor">Associate Professor</option>
                                                <option value="Professor">Professor</option>
                                                <option value="Lecturer">Lecturer</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Registering...' : 'Create Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
