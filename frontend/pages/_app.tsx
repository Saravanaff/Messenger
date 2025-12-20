import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <AuthProvider>
            <SocketProvider>
                <Component {...pageProps} />
            </SocketProvider>
        </AuthProvider>
    );
}
