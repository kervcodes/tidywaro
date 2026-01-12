import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../services/supabase';
import { logAuth, logger } from '../utils/logger';

interface AuthContextType {
    session: Session | null;
    isLoading: boolean;
    hasCompletedOnboarding: boolean;
    completeOnboarding: () => Promise<void>;
    signOut: () => Promise<void>;
    selectedAvatar: string | null;
    setSelectedAvatar: (avatar: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ONBOARDING_KEY = 'has_completed_onboarding';
const AVATAR_KEY = 'tidywaro_selected_avatar';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
    const [selectedAvatar, setAvatarState] = useState<string | null>(null);

    useEffect(() => {
        // Load session and onboarding status
        const loadState = async () => {
            logger.debug('Loading auth state...');
            try {
                // 1. Check Supabase Session
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                logAuth.sessionRestored(!!session);

                // 2. Listen for Auth Changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    logger.debug('Auth state changed', { event, hasSession: !!session });
                    setSession(session);

                    if (event === 'SIGNED_IN') {
                        logAuth.signIn(true);
                    } else if (event === 'SIGNED_OUT') {
                        logAuth.signOut();
                    } else if (event === 'TOKEN_REFRESHED') {
                        logAuth.tokenRefresh(true);
                    }
                });

                // 3. Check Onboarding Status
                const onboardingStatus = await SecureStore.getItemAsync(ONBOARDING_KEY);
                const hasOnboarded = onboardingStatus === 'true';
                setHasCompletedOnboarding(hasOnboarded);

                // 4. Check Selected Avatar
                const savedAvatar = await SecureStore.getItemAsync(AVATAR_KEY);
                setAvatarState(savedAvatar);

                logger.debug('Auth state loaded', { hasOnboarded, hasAvatar: !!savedAvatar });

                return () => {
                    subscription.unsubscribe();
                };
            } catch (error) {
                logger.error('Failed to load auth state', { error: String(error) });
            } finally {
                setIsLoading(false);
                logger.debug('Auth state loading complete');
            }
        };

        loadState();
    }, []);

    const completeOnboarding = async () => {
        try {
            await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
            setHasCompletedOnboarding(true);
            logger.info('Onboarding completed');
        } catch (error) {
            logger.error('Failed to save onboarding status', { error: String(error) });
        }
    };

    const setSelectedAvatar = async (avatar: string) => {
        try {
            await SecureStore.setItemAsync(AVATAR_KEY, avatar);
            setAvatarState(avatar);
            logger.info('Avatar updated', { avatar });
        } catch (error) {
            logger.error('Failed to save avatar', { error: String(error) });
        }
    };

    const signOut = async () => {
        try {
            logger.info('Signing out...');
            await supabase.auth.signOut();
            logAuth.signOut();
            // Optional: Reset onboarding? usage dictates usually no, but helpful for testing.
            // await SecureStore.deleteItemAsync(ONBOARDING_KEY); 
        } catch (error) {
            logger.error('Sign out error', { error: String(error) });
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            isLoading,
            hasCompletedOnboarding,
            completeOnboarding,
            signOut,
            selectedAvatar,
            setSelectedAvatar
        }}>
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

