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

            // TODO: Replace with real auth flow (Supabase Auth)
            // For now, we use a dev-only token from .env
            // HARDCODED FOR TESTING ON PHYSICAL DEVICE - FRESH TOKEN (expires 2025-11-23T18:25:57)
            const envToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6Im84ZjhqWjUxWjRDbDNGZ3giLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2RlZW1rZ29ha2pibG94cmNqZWZmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2ZTg3YmExNi1hYzVkLTRjMGQtYTAwZS1hMDZkY2E4ZjIyMWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYzOTIyMzU3LCJpYXQiOjE3NjM5MTg3NTcsImVtYWlsIjoidGVzdHVzZXIxNzYzOTE4NzU2ODk1QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJ0ZXN0dXNlcjE3NjM5MTg3NTY4OTVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNmU4N2JhMTYtYWM1ZC00YzBkLWEwMGUtYTA2ZGNhOGYyMjFhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjM5MTg3NTd9XSwic2Vzc2lvbl9pZCI6Ijg5Nzc5NWM5LTIxNzgtNGRhNy04NmMzLWMwY2JkODMxMDI0ZCIsImlzX2Fub255bW91cyI6ZmFsc2V9.heN5ZXG6INHGd479ZYtsAUaoVH7QUwjftu32A6BZChk";

            // FORCE OVERWRITE for testing
            if (envToken) {
                await SecureStore.setItemAsync(TOKEN_KEY, envToken);
                storedToken = envToken;
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
