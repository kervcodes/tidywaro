import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { theme } from '../styles/theme';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
    const { completeOnboarding } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="images-outline" size={120} color={theme.colors.primary.solid} />
                </View>

                <Text style={styles.title}>Digitize Your Wardrobe</Text>
                <Text style={styles.description}>
                    Take photos of your clothes, organize them by category, and let AI help you plan your weekly outfits.
                </Text>

                <View style={styles.featureList}>
                    <FeatureItem icon="camera-outline" text="Upload unlimited items" />
                    <FeatureItem icon="calendar-outline" text="Plan outfits for the week" />
                    <FeatureItem icon="sparkles-outline" text="AI-powered suggestions" />
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Get Started"
                    onPress={completeOnboarding}
                    variant="primary"
                    size="lg"
                    fullWidth
                />
            </View>
        </View>
    );
}

function FeatureItem({ icon, text }: { icon: any, text: string }) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
                <Ionicons name={icon} size={24} color={theme.colors.primary.solid} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    iconContainer: {
        marginBottom: theme.spacing['3xl'],
        backgroundColor: theme.colors.background.secondary, // Changed from primary.light which doesn't exist
        padding: theme.spacing.xl,
        borderRadius: 100, // Circle
    },
    title: {
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    description: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing['2xl'],
        lineHeight: 24,
    },
    featureList: {
        width: '100%',
        gap: theme.spacing.lg,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.neutral[50],
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
    },
    featureIcon: {
        backgroundColor: theme.colors.background.primary,
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    featureText: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.primary,
    },
    footer: {
        padding: theme.spacing.xl,
        paddingBottom: theme.spacing['2xl'],
    },
});
