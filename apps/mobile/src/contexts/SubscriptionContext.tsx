import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Linking, Alert } from 'react-native';
import { useAuth } from './AuthContext';
import {
    SubscriptionInfo,
    getSubscription,
    checkItemLimit,
    createCheckoutSession,
    createBillingPortalSession,
    cancelSubscription as apiCancelSubscription,
    resumeSubscription as apiResumeSubscription,
} from '../services/api';
import { logger } from '../utils/logger';

interface SubscriptionContextType {
    subscription: SubscriptionInfo | null;
    isLoading: boolean;
    error: string | null;
    
    // Computed properties
    isPremium: boolean;
    canAddItems: boolean;
    itemsRemaining: number;
    
    // Actions
    refreshSubscription: () => Promise<void>;
    checkCanAddItem: () => Promise<boolean>;
    upgradeToPremium: (priceType?: 'monthly' | 'yearly') => Promise<void>;
    openBillingPortal: () => Promise<void>;
    cancelSubscription: () => Promise<void>;
    resumeSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
    tier: 'free',
    status: 'active',
    itemLimit: 10,
    itemsUsed: 0,
    canAddItems: true,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
};

interface SubscriptionProviderProps {
    children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
    const { session } = useAuth();
    const token = session?.access_token;
    
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Computed properties
    const isPremium = subscription?.tier === 'premium' && subscription?.status === 'active';
    const canAddItems = subscription?.canAddItems ?? true;
    const itemsRemaining = subscription 
        ? (subscription.itemLimit === -1 ? Infinity : subscription.itemLimit - subscription.itemsUsed)
        : 10;

    // Fetch subscription info
    const refreshSubscription = useCallback(async () => {
        if (!token) {
            setSubscription(DEFAULT_SUBSCRIPTION);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await getSubscription(token);
            setSubscription(data);
            logger.debug('Subscription refreshed', { 
                tier: data.tier, 
                itemsUsed: data.itemsUsed,
                itemLimit: data.itemLimit,
            });
        } catch (err: any) {
            logger.error('Failed to fetch subscription', { error: err.message });
            setError(err.message);
            // Use default subscription on error
            setSubscription(DEFAULT_SUBSCRIPTION);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Check if user can add item (quick check)
    const checkCanAddItem = useCallback(async (): Promise<boolean> => {
        if (!token) return true;

        try {
            const result = await checkItemLimit(token);
            // Update local state
            setSubscription(prev => prev ? {
                ...prev,
                itemsUsed: result.itemsUsed,
                canAddItems: result.allowed,
            } : null);
            return result.allowed;
        } catch (err: any) {
            logger.error('Failed to check item limit', { error: err.message });
            return true; // Allow on error, server will validate
        }
    }, [token]);

    // Upgrade to premium
    const upgradeToPremium = useCallback(async (priceType: 'monthly' | 'yearly' = 'monthly') => {
        if (!token) {
            Alert.alert('Sign In Required', 'Please sign in to upgrade to Premium.');
            return;
        }

        setIsLoading(true);
        try {
            // For mobile, we'll use deep linking URLs
            // These should be configured in your app
            const successUrl = 'tidywaro://subscription/success';
            const cancelUrl = 'tidywaro://subscription/cancel';

            const session = await createCheckoutSession(token, priceType, successUrl, cancelUrl);
            
            // Open Stripe Checkout in browser
            const canOpen = await Linking.canOpenURL(session.url);
            if (canOpen) {
                await Linking.openURL(session.url);
            } else {
                Alert.alert('Error', 'Unable to open checkout page. Please try again.');
            }
        } catch (err: any) {
            logger.error('Failed to create checkout session', { error: err.message });
            Alert.alert('Error', err.message || 'Failed to start checkout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Open billing portal for subscription management
    const openBillingPortal = useCallback(async () => {
        if (!token) {
            Alert.alert('Sign In Required', 'Please sign in to manage your subscription.');
            return;
        }

        setIsLoading(true);
        try {
            const returnUrl = 'tidywaro://subscription/portal';
            const session = await createBillingPortalSession(token, returnUrl);
            
            const canOpen = await Linking.canOpenURL(session.url);
            if (canOpen) {
                await Linking.openURL(session.url);
            } else {
                Alert.alert('Error', 'Unable to open billing portal. Please try again.');
            }
        } catch (err: any) {
            logger.error('Failed to open billing portal', { error: err.message });
            Alert.alert('Error', err.message || 'Failed to open billing portal. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Cancel subscription
    const cancelSubscription = useCallback(async () => {
        if (!token) return;

        Alert.alert(
            'Cancel Subscription',
            'Are you sure you want to cancel? You will keep Premium access until the end of your billing period.',
            [
                { text: 'Keep Subscription', style: 'cancel' },
                {
                    text: 'Cancel Subscription',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await apiCancelSubscription(token);
                            await refreshSubscription();
                            Alert.alert('Subscription Canceled', 'Your subscription will end at the end of your billing period.');
                        } catch (err: any) {
                            logger.error('Failed to cancel subscription', { error: err.message });
                            Alert.alert('Error', err.message || 'Failed to cancel subscription.');
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    }, [token, refreshSubscription]);

    // Resume subscription
    const resumeSubscription = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            await apiResumeSubscription(token);
            await refreshSubscription();
            Alert.alert('Subscription Resumed', 'Your Premium subscription has been resumed.');
        } catch (err: any) {
            logger.error('Failed to resume subscription', { error: err.message });
            Alert.alert('Error', err.message || 'Failed to resume subscription.');
        } finally {
            setIsLoading(false);
        }
    }, [token, refreshSubscription]);

    // Fetch subscription on mount and when token changes
    useEffect(() => {
        refreshSubscription();
    }, [refreshSubscription]);

    // Handle deep links for subscription callbacks
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            if (url.includes('subscription/success')) {
                logger.info('Subscription checkout success');
                refreshSubscription();
                Alert.alert('Welcome to Premium!', 'Your subscription is now active. Enjoy unlimited items!');
            } else if (url.includes('subscription/cancel')) {
                logger.info('Subscription checkout canceled');
            } else if (url.includes('subscription/portal')) {
                logger.info('Returned from billing portal');
                refreshSubscription();
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, [refreshSubscription]);

    const value: SubscriptionContextType = {
        subscription,
        isLoading,
        error,
        isPremium,
        canAddItems,
        itemsRemaining,
        refreshSubscription,
        checkCanAddItem,
        upgradeToPremium,
        openBillingPortal,
        cancelSubscription,
        resumeSubscription,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
