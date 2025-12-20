import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push('/chat');
            } else {
                router.push('/login');
            }
        }
    }, [user, loading, router]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh'
        }}>
            <div className="pulse" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                Loading...
            </div>
        </div>
    );
}
