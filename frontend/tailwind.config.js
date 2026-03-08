/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Student Theme - Muted Blue + Soft Green
        student: {
          primary: '#4A6FA5',
          secondary: '#6B9080',
          accent: '#88B4A8',
          bg: '#F5F7FA',
          card: '#FFFFFF',
          text: '#2D3748',
          muted: '#718096',
        },
        // Teacher Theme - Deep Teal + Muted Purple
        teacher: {
          primary: '#2C7A7B',
          secondary: '#6B5B95',
          accent: '#81E6D9',
          bg: '#F7FAFC',
          card: '#FFFFFF',
          text: '#1A202C',
          muted: '#4A5568',
        },
        // Admin Theme - Neutral Gray + Dark Slate
        admin: {
          primary: '#4A5568',
          secondary: '#2D3748',
          accent: '#63B3ED',
          bg: '#EDF2F7',
          card: '#FFFFFF',
          text: '#1A202C',
          muted: '#718096',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
