import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import RegisterForm from '@/components/auth/RegisterForm';
import styles from '../styles/Auth.module.css';

export default function RegisterPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
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
                    <h1 className={styles.brandTitle}>Join Messenger</h1>
                    <p className={styles.brandSubtitle}>
                        Create your account and start connecting with your team
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div className={styles.featureText}>
                                <h3>Team Collaboration</h3>
                                <p>Connect with colleagues instantly</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <svg viewBox="0 0 24 24">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                </svg>
                            </div>
                            <div className={styles.featureText}>
                                <h3>Cross-Platform</h3>
                                <p>Access from any device</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div className={styles.featureText}>
                                <h3>Fast & Reliable</h3>
                                <p>Built on modern technology</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className={styles.rightPanel}>
                <div className={styles.formContainer}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Create Account</h2>
                        <p className={styles.formSubtitle}>Fill in your details to get started</p>
                    </div>

                    <RegisterForm />

                    <div className={styles.footer}>
                        Already have an account?{' '}
                        <Link href="/login" className={styles.link}>
                            Sign in instead
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
