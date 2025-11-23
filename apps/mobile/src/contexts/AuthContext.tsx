import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    setToken: (token: string) => Promise<void>;
    clearToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadToken = useCallback(async () => {
        try {
            let storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

            // If no token in secure storage, check environment variable and migrate it (dev only)
            if (!storedToken && __DEV__) {
                // TODO: Replace with real auth flow (Supabase Auth)
                // For now, we use a dev-only token from .env
                const envToken = process.env.EXPO_PUBLIC_DEV_TEMP_TOKEN;
                if (envToken) {
                    await SecureStore.setItemAsync(TOKEN_KEY, envToken);
                    storedToken = envToken;
                }
            }

            if (storedToken) {
                setTokenState(storedToken);
            }
        } catch (error) {
            console.error('Failed to load token:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Load token from secure storage on app start
        loadToken();
    }, [loadToken]);

    const setToken = async (newToken: string) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, newToken);
            setTokenState(newToken);
        } catch (error) {
            console.error('Failed to save token:', error);
            throw error;
        }
    };

    const clearToken = async () => {
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            setTokenState(null);
        } catch (error) {
            console.error('Failed to clear token:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ token, isLoading, setToken, clearToken }}>
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
