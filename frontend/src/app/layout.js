import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'HAQMS - Hospital Appointment & Queue Management',
  description: 'Deliberately imperfect queue and scheduling application for assessment purposes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      {/* OLD CODE:
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      */}
      {/* NEW CODE: */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('haqms_theme') === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (_) {}
        `}} />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen gradient-bg`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
