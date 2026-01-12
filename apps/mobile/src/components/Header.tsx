import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';

interface HeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export default function Header({ title, subtitle, showBack, onBack, rightAction }: HeaderProps) {
    const { signOut } = useAuth();

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut }
            ]
        );
    };

    return (
        <View style={styles.header}>
            <View style={styles.contentContainer}>
                {showBack && (
                    <TouchableOpacity
                        onPress={onBack}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                )}

                <View style={[styles.textContainer, showBack && styles.textContainerWithBack]}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            </View>

            {rightAction ? (
                <View style={styles.rightAction}>
                    {rightAction}
                </View>
            ) : (
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <LinearGradient
                        colors={[theme.colors.error, '#FF6B6B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.signOutGradient}
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    textContainerWithBack: {
        marginLeft: 12,
    },
    backButton: {
        marginRight: 4,
    },
    rightAction: {
        marginLeft: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text.primary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginTop: 4,
    },
    signOutButton: {
        borderRadius: 22,
        overflow: 'hidden',
        ...theme.shadows.md,
        marginLeft: 16,
    },
    signOutGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
