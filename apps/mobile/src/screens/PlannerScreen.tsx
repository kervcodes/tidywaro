import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { generateWeeklyPlan, getWeeklyPlan } from '../services/api';

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
    const insets = useSafeAreaInsets();
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Weekly Planner</Text>
            </View>

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

                        {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}

                        {plan.daily_outfits?.map(renderDay)}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        padding: 16,
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
        color: '#666',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginBottom: 24,
    },
    generateButton: {
        backgroundColor: '#0000ff',
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
        color: '#666',
    },
    regenerateButton: {
        padding: 8,
    },
    regenerateButtonText: {
        color: '#0000ff',
        fontSize: 14,
    },
    loader: {
        marginBottom: 16,
    },
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dayName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        fontSize: 14,
        color: '#999',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    weather: {
        fontSize: 14,
        color: '#666',
        marginRight: 12,
    },
    badge: {
        backgroundColor: '#e6e6ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: '#0000ff',
        fontSize: 12,
        fontWeight: '600',
    },
    itemsContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    itemsText: {
        fontSize: 14,
        color: '#333',
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
    },
});
