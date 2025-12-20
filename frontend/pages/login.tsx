import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import styles from '../styles/Auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            console.log('Login page: User already logged in, redirecting to chat');
            router.replace('/chat');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="pulse">Loading...</div>
            </div>
        );
    }

    if (user) {
        return null;
    }

    return (
        <div className={styles.page}>
            {/* Left Panel - Branding */}
            <div className={styles.leftPanel}>
                <div className={styles.brandContent}>
                    <div className={styles.logo}>M</div>
                    <h1 className={styles.brandTitle}>Welcome to Messenger</h1>
                    <p className={styles.brandSubtitle}>
                        Professional communication platform for teams and individuals
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                            </div>
                            <div className={styles.featureText}>
                                <h3>Real-time Messaging</h3>
                                <p>Instant delivery with Socket.io</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <div className={styles.featureText}>
                                <h3>Secure & Private</h3>
                                <p>End-to-end encryption</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <div className={styles.featureText}>
                                <h3>Enterprise Ready</h3>
                                <p>Built for professional teams</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className={styles.rightPanel}>
                <div className={styles.formContainer}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Sign In</h2>
                        <p className={styles.formSubtitle}>Enter your credentials to access your account</p>
                    </div>

                    <LoginForm />

                    <div className={styles.footer}>
                        Don't have an account?{' '}
                        <Link href="/register" className={styles.link}>
                            Create one now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
