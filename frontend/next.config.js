/** @type {import('next').NextConfig} */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig = {
    images: {
        domains: ['localhost'],
    },
    async rewrites() {
        return [{
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`,
            },
            {
                source: '/uploads/:path*',
                destination: `${API_URL}/uploads/:path*`,
            },
            {
                source: '/chat_uploads/:path*',
                destination: `${API_URL}/uploads/chat_uploads/:path*`
            },
        ];
    },
}

module.exports = nextConfig