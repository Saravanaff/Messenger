import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '@/lib/api';
import { initializeSocket, disconnectSocket } from '@/lib/socket';
import type { User, AuthResponse } from '@/types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= expirationTime;
    } catch {
        return true; // If we can't decode, treat as expired
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Validate token with backend
    const validateToken = async (storedToken: string): Promise<boolean> => {
        try {
            // First check if token is expired locally
            if (isTokenExpired(storedToken)) {
                console.log('Token expired locally');
                return false;
            }

            // Then validate with backend
            const response = await authAPI.me(storedToken);
            return !!response?.user;
        } catch (error) {
            console.log('Token validation failed:', error);
            return false;
        }
    };

    // Clear auth data and redirect to login
    const clearAuthData = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        disconnectSocket();
    };

    // Load and validate user from localStorage on mount
    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                // Validate the token before using it
                const isValid = await validateToken(storedToken);

                if (isValid) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    initializeSocket(storedToken);
                } else {
                    // Token is invalid or expired, clear auth data
                    console.log('Session expired. Please login again.');
                    clearAuthData();
                }
            }

            setLoading(false);
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            console.log('AuthContext: Starting login...');
            const response: AuthResponse = await authAPI.login(email, password);
            console.log('AuthContext: Login API response received', response);

            setToken(response.token);
            setUser(response.user);

            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            initializeSocket(response.token);

            console.log('AuthContext: Redirecting to /chat');
            await router.push('/chat');
            console.log('AuthContext: Redirect complete');
        } catch (error: any) {
            console.error('AuthContext: Login failed', error);
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const register = async (username: string, email: string, password: string) => {
        try {
            const response: AuthResponse = await authAPI.register(username, email, password);

            setToken(response.token);
            setUser(response.user);

            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            initializeSocket(response.token);

            router.push('/chat');
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        disconnectSocket();

        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
