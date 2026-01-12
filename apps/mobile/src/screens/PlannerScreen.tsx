import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { generateWeeklyPlan, getWeeklyPlan } from '../services/api';
import Header from '../components/Header';
import { theme } from '../styles/theme';

interface DailyOutfit {
    id: string;
    date: string;
    day_of_week: string;
    occasion: string;
    weather_summary: string;
    items: string[]; // Array of item IDs
}

interface WeeklyPlan {
    id: string;
    start_date: string;
    end_date: string;
    daily_outfits: DailyOutfit[];
}

export default function PlannerScreen() {
    const { session } = useAuth();
    const token = session?.access_token;
    const [loading, setLoading] = useState(false);
    const [weekPlan, setWeekPlan] = useState<WeeklyPlan | null>(null);

    useEffect(() => {
        if (token) {
            fetchCurrentPlan();
        }
    }, [token]);

    const fetchCurrentPlan = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await getWeeklyPlan(token);
            setPlan(data);
        } catch (error) {
            // Ignore 404 (no plan found)
            console.log('No active plan found or fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePlan = async () => {
        if (!token) {
            Alert.alert('Error', 'Authentication required');
            return;
        }

        try {
            setLoading(true);
            const startDate = new Date().toISOString().split('T')[0]; // Start today
            const data = await generateWeeklyPlan(startDate, token);
            setPlan({
                id: data.plan.id,
                start_date: data.plan.start_date,
                end_date: data.plan.end_date,
                daily_outfits: data.outfits
            });
            Alert.alert('Success', 'Weekly plan generated!');
        } catch (error: any) {
            console.error('Generate error:', error);
            Alert.alert('Generation Failed', error.message || 'Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const renderDay = (day: DailyOutfit) => (
        <View key={day.date} style={styles.dayCard}>
            <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.day_of_week}</Text>
                <Text style={styles.date}>{day.date}</Text>
            </View>

            <View style={styles.infoRow}>
                <Text style={styles.weather}>{day.weather_summary}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{day.occasion}</Text>
                </View>
            </View>

            <View style={styles.itemsContainer}>
                {day.items.length > 0 ? (
                    <Text style={styles.itemsText}>Items: {day.items.join(', ')}</Text>
                ) : (
                    <Text style={styles.emptyText}>No items selected</Text>
                )}
                {/* TODO: Fetch and display actual item images */}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Style AI" subtitle="Your weekly outfit planner" />

            <ScrollView contentContainerStyle={styles.content}>
                {!plan ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No plan for this week.</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Generate a 7-day outfit plan based on your wardrobe and the weather.
                        </Text>
                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={handleGeneratePlan}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.generateButtonText}>Generate Plan</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <View style={styles.planHeader}>
                            <Text style={styles.planDateRange}>
                                {plan.start_date} - {plan.end_date}
                            </Text>
                            <TouchableOpacity
                                style={styles.regenerateButton}
                                onPress={handleGeneratePlan}
                                disabled={loading}
                            >
                                <Text style={styles.regenerateButtonText}>Regenerate</Text>
                            </TouchableOpacity>
                        </View>

                        {loading && <ActivityIndicator size="large" color={theme.colors.primary.solid} style={styles.loader} />}

                        {plan.daily_outfits?.map(renderDay)}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 140,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        padding: 20,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    generateButton: {
        backgroundColor: theme.colors.primary.solid,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 160,
        alignItems: 'center',
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planDateRange: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    regenerateButton: {
        padding: 8,
    },
    regenerateButtonText: {
        color: theme.colors.primary.solid,
        fontSize: 14,
    },
    loader: {
        marginBottom: 16,
    },
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...theme.shadows.md,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dayName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    date: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    weather: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginRight: 12,
    },
    badge: {
        backgroundColor: theme.colors.primary.solid + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: theme.colors.primary.solid,
        fontSize: 12,
        fontWeight: '600',
    },
    itemsContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.neutral[100],
    },
    itemsText: {
        fontSize: 14,
        color: theme.colors.text.primary,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
        fontStyle: 'italic',
    },
});
