import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import Button from '../components/Button';
import { theme } from '../styles/theme';

type PriceOption = 'monthly' | 'yearly';

const PRICING = {
    monthly: {
        price: '$4.99',
        period: '/month',
        savings: null,
    },
    yearly: {
        price: '$39.99',
        period: '/year',
        savings: 'Save 33%',
    },
};

const PREMIUM_FEATURES = [
    {
        icon: 'infinite-outline' as const,
        title: 'Unlimited Wardrobe Items',
        description: 'Add as many clothes as you want',
    },
    {
        icon: 'sparkles' as const,
        title: 'AI Style Recommendations',
        description: 'Get personalized outfit suggestions',
    },
    {
        icon: 'calendar-outline' as const,
        title: 'Advanced Weekly Planning',
        description: 'Plan outfits for any occasion',
    },
    {
        icon: 'shirt-outline' as const,
        title: 'Virtual Try-On',
        description: 'See how outfits look before wearing',
    },
    {
        icon: 'cloud-outline' as const,
        title: 'Cloud Backup',
        description: 'Your wardrobe synced across devices',
    },
];

export default function UpgradeScreen() {
    const navigation = useNavigation<any>();
    const { subscription, isLoading, upgradeToPremium, openBillingPortal, isPremium } = useSubscription();
    const [selectedPrice, setSelectedPrice] = useState<PriceOption>('yearly');
    const [processing, setProcessing] = useState(false);

    const handleUpgrade = async () => {
        setProcessing(true);
        try {
            await upgradeToPremium(selectedPrice);
        } finally {
            setProcessing(false);
        }
    };

    const handleManageSubscription = async () => {
        setProcessing(true);
        try {
            await openBillingPortal();
        } finally {
            setProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.solid} />
            </View>
        );
    }

    // If already premium, show manage subscription view
    if (isPremium) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="close" size={28} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <LinearGradient
                        colors={[theme.colors.primary.start, theme.colors.primary.end]}
                        style={styles.premiumBadge}
                    >
                        <Ionicons name="star" size={32} color="white" />
                        <Text style={styles.premiumBadgeText}>Premium Active</Text>
                    </LinearGradient>

                    <Text style={styles.manageTitleText}>
                        You're enjoying all Premium features!
                    </Text>

                    <View style={styles.usageCard}>
                        <Text style={styles.usageTitle}>Your Usage</Text>
                        <View style={styles.usageRow}>
                            <Text style={styles.usageLabel}>Items in Wardrobe</Text>
                            <Text style={styles.usageValue}>{subscription?.itemsUsed || 0}</Text>
                        </View>
                        <View style={styles.usageRow}>
                            <Text style={styles.usageLabel}>Item Limit</Text>
                            <Text style={styles.usageValue}>Unlimited</Text>
                        </View>
                        {subscription?.currentPeriodEnd && (
                            <View style={styles.usageRow}>
                                <Text style={styles.usageLabel}>Renews On</Text>
                                <Text style={styles.usageValue}>
                                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                        {subscription?.cancelAtPeriodEnd && (
                            <View style={styles.cancelWarning}>
                                <Ionicons name="warning" size={20} color={theme.colors.warning} />
                                <Text style={styles.cancelWarningText}>
                                    Cancels at period end
                                </Text>
                            </View>
                        )}
                    </View>

                    <Button
                        title="Manage Subscription"
                        onPress={handleManageSubscription}
                        variant="secondary"
                        size="lg"
                        fullWidth
                        loading={processing}
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Free tier - show upgrade options
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.closeButton} 
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="close" size={28} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                </View>

                {/* Hero Section */}
                <LinearGradient
                    colors={[theme.colors.primary.start, theme.colors.primary.end]}
                    style={styles.heroGradient}
                >
                    <Ionicons name="diamond-outline" size={48} color="white" />
                    <Text style={styles.heroTitle}>Upgrade to Premium</Text>
                    <Text style={styles.heroSubtitle}>
                        Unlock unlimited wardrobe items and exclusive features
                    </Text>
                </LinearGradient>

                {/* Usage Warning */}
                {subscription && subscription.itemsUsed >= subscription.itemLimit && (
                    <View style={styles.limitWarning}>
                        <Ionicons name="warning" size={24} color={theme.colors.warning} />
                        <Text style={styles.limitWarningText}>
                            You've used {subscription.itemsUsed} of {subscription.itemLimit} items
                        </Text>
                    </View>
                )}

                {/* Price Options */}
                <View style={styles.priceOptionsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.priceOption,
                            selectedPrice === 'yearly' && styles.priceOptionSelected,
                        ]}
                        onPress={() => setSelectedPrice('yearly')}
                    >
                        {PRICING.yearly.savings && (
                            <View style={styles.savingsBadge}>
                                <Text style={styles.savingsText}>{PRICING.yearly.savings}</Text>
                            </View>
                        )}
                        <Text style={styles.priceOptionLabel}>Yearly</Text>
                        <Text style={styles.priceAmount}>{PRICING.yearly.price}</Text>
                        <Text style={styles.pricePeriod}>{PRICING.yearly.period}</Text>
                        {selectedPrice === 'yearly' && (
                            <View style={styles.checkmark}>
                                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.solid} />
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.priceOption,
                            selectedPrice === 'monthly' && styles.priceOptionSelected,
                        ]}
                        onPress={() => setSelectedPrice('monthly')}
                    >
                        <Text style={styles.priceOptionLabel}>Monthly</Text>
                        <Text style={styles.priceAmount}>{PRICING.monthly.price}</Text>
                        <Text style={styles.pricePeriod}>{PRICING.monthly.period}</Text>
                        {selectedPrice === 'monthly' && (
                            <View style={styles.checkmark}>
                                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.solid} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Features List */}
                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>What's Included</Text>
                    {PREMIUM_FEATURES.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <LinearGradient
                                colors={[theme.colors.primary.start, theme.colors.primary.end]}
                                style={styles.featureIconContainer}
                            >
                                <Ionicons name={feature.icon} size={20} color="white" />
                            </LinearGradient>
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDescription}>{feature.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* CTA Button */}
                <View style={styles.ctaContainer}>
                    <Button
                        title={`Continue with ${selectedPrice === 'yearly' ? 'Yearly' : 'Monthly'}`}
                        onPress={handleUpgrade}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={processing}
                        icon={<Ionicons name="sparkles" size={20} color="white" />}
                    />
                    <Text style={styles.termsText}>
                        Cancel anytime. Subscription auto-renews.
                    </Text>
                </View>

                {/* Current Usage */}
                <View style={styles.currentPlanCard}>
                    <Text style={styles.currentPlanTitle}>Current Plan: Free</Text>
                    <View style={styles.usageBar}>
                        <View 
                            style={[
                                styles.usageBarFill, 
                                { 
                                    width: `${Math.min((subscription?.itemsUsed || 0) / (subscription?.itemLimit || 10) * 100, 100)}%`,
                                    backgroundColor: (subscription?.itemsUsed || 0) >= (subscription?.itemLimit || 10) 
                                        ? theme.colors.error 
                                        : theme.colors.primary.solid,
                                }
                            ]} 
                        />
                    </View>
                    <Text style={styles.usageText}>
                        {subscription?.itemsUsed || 0} / {subscription?.itemLimit || 10} items used
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.primary,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: theme.spacing.md,
    },
    closeButton: {
        padding: theme.spacing.sm,
    },
    heroGradient: {
        borderRadius: 24,
        padding: theme.spacing.xl,
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        marginTop: theme.spacing.md,
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
    limitWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: theme.spacing.md,
        borderRadius: 12,
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    limitWarningText: {
        flex: 1,
        color: theme.colors.warning,
        fontSize: 14,
        fontWeight: '500',
    },
    priceOptionsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    priceOption: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 16,
        padding: theme.spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    priceOptionSelected: {
        borderColor: theme.colors.primary.solid,
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
    },
    savingsBadge: {
        position: 'absolute',
        top: -10,
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    savingsText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    priceOptionLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
    priceAmount: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text.primary,
    },
    pricePeriod: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
    },
    checkmark: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
    },
    featuresContainer: {
        marginBottom: theme.spacing.xl,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    featureDescription: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    ctaContainer: {
        marginBottom: theme.spacing.xl,
    },
    termsText: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
    currentPlanCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 16,
        padding: theme.spacing.lg,
    },
    currentPlanTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    usageBar: {
        height: 8,
        backgroundColor: theme.colors.neutral[200],
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing.sm,
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    usageText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    // Premium active styles
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
        borderRadius: 16,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    premiumBadgeText: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
    },
    manageTitleText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    usageCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 16,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    usageTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    usageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral[200],
    },
    usageLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    usageValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    cancelWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    cancelWarningText: {
        color: theme.colors.warning,
        fontSize: 14,
        fontWeight: '500',
    },
});
