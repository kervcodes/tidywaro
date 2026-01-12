import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    Animated,
    RefreshControl,
    Dimensions,
    Modal,
    Pressable,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { generateWeeklyPlan, getWeeklyPlan, getWardrobeItems } from '../services/api';
import Header from '../components/Header';
import Button from '../components/Button';
import { theme } from '../styles/theme';
import { logger } from '../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - theme.spacing.lg * 2;
const OUTFIT_ITEM_SIZE = (SCREEN_WIDTH - theme.spacing.lg * 3) / 2;

interface WardrobeItem {
    id: string;
    category: string;
    subcategory: string;
    color: string;
    style?: string;
    image_url: string;
    processed_image_url?: string;
}

interface DailyOutfit {
    id: string;
    date: string;
    day_of_week: string;
    occasion: string;
    weather_summary: string;
    items: string[];
    style_notes?: string;
}

interface WeeklyPlan {
    id: string;
    start_date: string;
    end_date: string;
    daily_outfits: DailyOutfit[];
}

const WEEKDAY_ICONS: { [key: string]: string } = {
    'Monday': 'briefcase-outline',
    'Tuesday': 'cafe-outline',
    'Wednesday': 'bulb-outline',
    'Thursday': 'flash-outline',
    'Friday': 'happy-outline',
    'Saturday': 'sunny-outline',
    'Sunday': 'leaf-outline',
};

const OCCASION_COLORS: { [key: string]: string } = {
    'work': theme.colors.primary.solid,
    'casual': theme.colors.secondary.start,
    'formal': '#1a1a2e',
    'sport': '#10b981',
    'party': '#ec4899',
    'outdoor': '#f59e0b',
    'date': '#ef4444',
};

export default function StyleAIScreen() {
    const { session } = useAuth();
    const token = session?.access_token;
    const navigation = useNavigation<any>();

    const [loading, setLoading] = useState(true); // Start with loading=true
    const [generating, setGenerating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [weekPlan, setWeekPlan] = useState<WeeklyPlan | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<Map<string, WardrobeItem>>(new Map());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [outfitModalVisible, setOutfitModalVisible] = useState(false);
    const [selectedOutfit, setSelectedOutfit] = useState<DailyOutfit | null>(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const modalAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (token) {
            fetchData();
        } else {
            setLoading(false); // No token, don't stay in loading
        }
    }, [token]);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        logger.debug('StyleAI: Fetching data...');
        try {
            // Fetch wardrobe items and current plan in parallel
            const [items, planData] = await Promise.all([
                getWardrobeItems(token).catch((e) => {
                    logger.error('StyleAI: Failed to fetch wardrobe items', { error: e.message });
                    return [];
                }),
                getWeeklyPlan(token).catch((e) => {
                    logger.error('StyleAI: Failed to fetch weekly plan', { error: e.message });
                    return null;
                }),
            ]);

            logger.debug('StyleAI: Data fetched', { itemCount: items?.length || 0, hasPlan: !!planData });

            // Create a map of items by ID for quick lookup
            const itemsMap = new Map<string, WardrobeItem>();
            if (items && Array.isArray(items)) {
                items.forEach((item: WardrobeItem) => itemsMap.set(item.id, item));
            }
            setWardrobeItems(itemsMap);

            if (planData) {
                setWeekPlan({
                    id: planData.plan?.id || planData.id,
                    start_date: planData.plan?.start_date || planData.start_date,
                    end_date: planData.plan?.end_date || planData.end_date,
                    daily_outfits: planData.outfits || planData.daily_outfits || [],
                });
            } else {
                setWeekPlan(null);
            }
        } catch (error: any) {
            logger.error('StyleAI: Failed to fetch data', { error: error.message });
        } finally {
            logger.debug('StyleAI: Loading complete');
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [token]);

    const handleGeneratePlan = async () => {
        if (!token) {
            Alert.alert('Error', 'Please sign in to generate a plan');
            return;
        }

        if (wardrobeItems.size < 5) {
            Alert.alert(
                'Not Enough Items',
                'Add at least 5 items to your wardrobe to generate outfit suggestions.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            setGenerating(true);
            logger.info('Generating weekly plan');

            const startDate = new Date().toISOString().split('T')[0];
            const data = await generateWeeklyPlan(startDate, token);

            setWeekPlan({
                id: data.plan.id,
                start_date: data.plan.start_date,
                end_date: data.plan.end_date,
                daily_outfits: data.outfits,
            });

            logger.info('Weekly plan generated successfully');
            Alert.alert('✨ Plan Ready!', 'Your personalized weekly outfit plan is ready.');
        } catch (error: any) {
            logger.error('Failed to generate plan', { error: error.message });
            Alert.alert('Generation Failed', error.message || 'Please try again later.');
        } finally {
            setGenerating(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getOccasionColor = (occasion: string) => {
        const key = occasion.toLowerCase();
        return OCCASION_COLORS[key] || theme.colors.primary.solid;
    };

    const renderItemThumbnail = (itemId: string, index: number) => {
        const item = wardrobeItems.get(itemId);
        if (!item) {
            return (
                <View key={index} style={styles.thumbnailPlaceholder}>
                    <Ionicons name="shirt-outline" size={20} color={theme.colors.neutral[400]} />
                </View>
            );
        }

        return (
            <Image
                key={item.id}
                source={{ uri: item.processed_image_url || item.image_url }}
                style={styles.itemThumbnail}
            />
        );
    };

    const renderDayCard = (day: DailyOutfit, index: number) => {
        const isSelected = selectedDay === day.id;
        const occasionColor = getOccasionColor(day.occasion);
        const iconName = WEEKDAY_ICONS[day.day_of_week] || 'calendar-outline';

        return (
            <Animated.View
                key={day.id || index}
                style={[
                    styles.dayCard,
                    isSelected && styles.dayCardSelected,
                    { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setSelectedDay(isSelected ? null : day.id)}
                >
                    {/* Day Header */}
                    <View style={styles.dayHeader}>
                        <View style={styles.dayInfo}>
                            <View style={[styles.dayIcon, { backgroundColor: occasionColor + '20' }]}>
                                <Ionicons name={iconName as any} size={20} color={occasionColor} />
                            </View>
                            <View>
                                <Text style={styles.dayName}>{day.day_of_week}</Text>
                                <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                            </View>
                        </View>
                        <View style={[styles.occasionBadge, { backgroundColor: occasionColor + '15' }]}>
                            <Text style={[styles.occasionText, { color: occasionColor }]}>
                                {day.occasion}
                            </Text>
                        </View>
                    </View>

                    {/* Weather */}
                    {day.weather_summary && (
                        <View style={styles.weatherRow}>
                            <Ionicons name="partly-sunny-outline" size={16} color={theme.colors.text.secondary} />
                            <Text style={styles.weatherText}>{day.weather_summary}</Text>
                        </View>
                    )}

                    {/* Outfit Items */}
                    <View style={styles.outfitPreview}>
                        {day.items && day.items.length > 0 ? (
                            <View style={styles.thumbnailRow}>
                                {day.items.slice(0, 4).map((itemId, idx) => renderItemThumbnail(itemId, idx))}
                                {day.items.length > 4 && (
                                    <View style={styles.moreBadge}>
                                        <Text style={styles.moreText}>+{day.items.length - 4}</Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.noItemsContainer}>
                                <Ionicons name="shirt-outline" size={24} color={theme.colors.neutral[300]} />
                                <Text style={styles.noItemsText}>No items assigned</Text>
                            </View>
                        )}
                    </View>

                    {/* Style Notes (expanded) */}
                    {isSelected && day.style_notes && (
                        <View style={styles.styleNotes}>
                            <Text style={styles.styleNotesLabel}>Style Notes</Text>
                            <Text style={styles.styleNotesText}>{day.style_notes}</Text>
                        </View>
                    )}

                    {/* View Outfit Button */}
                    {day.items && day.items.length > 0 && (
                        <TouchableOpacity
                            style={styles.viewOutfitButton}
                            onPress={() => openOutfitModal(day)}
                        >
                            <Text style={styles.viewOutfitText}>View Full Outfit</Text>
                            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary.solid} />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // Open outfit detail modal
    const openOutfitModal = (day: DailyOutfit) => {
        setSelectedOutfit(day);
        setOutfitModalVisible(true);
        Animated.spring(modalAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    // Close outfit detail modal
    const closeOutfitModal = () => {
        Animated.timing(modalAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setOutfitModalVisible(false);
            setSelectedOutfit(null);
        });
    };

    // Navigate to item detail for CRUD operations
    const handleItemPress = (itemId: string) => {
        closeOutfitModal();
        // Small delay to allow modal to close before navigation
        setTimeout(() => {
            navigation.navigate('ItemDetail', { itemId });
        }, 250);
    };

    // Render outfit item card in modal
    const renderOutfitItemCard = (itemId: string, index: number) => {
        const item = wardrobeItems.get(itemId);
        if (!item) {
            return (
                <View key={index} style={styles.outfitItemCard}>
                    <View style={styles.outfitItemImagePlaceholder}>
                        <Ionicons name="shirt-outline" size={40} color={theme.colors.neutral[300]} />
                    </View>
                    <Text style={styles.outfitItemCategory}>Unknown Item</Text>
                </View>
            );
        }

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.outfitItemCard}
                activeOpacity={0.7}
                onPress={() => handleItemPress(item.id)}
            >
                <Image
                    source={{ uri: item.processed_image_url || item.image_url }}
                    style={styles.outfitItemImage}
                    resizeMode="cover"
                />
                <View style={styles.outfitItemInfo}>
                    <Text style={styles.outfitItemCategory} numberOfLines={1}>
                        {item.subcategory || item.category}
                    </Text>
                    <Text style={styles.outfitItemColor} numberOfLines={1}>
                        {item.color}
                    </Text>
                </View>
                <View style={styles.tapIndicator}>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.text.tertiary} />
                </View>
            </TouchableOpacity>
        );
    };

    // Render outfit detail modal
    const renderOutfitModal = () => {
        if (!selectedOutfit) return null;

        const occasionColor = getOccasionColor(selectedOutfit.occasion);
        const iconName = WEEKDAY_ICONS[selectedOutfit.day_of_week] || 'calendar-outline';
        const outfitItems = selectedOutfit.items || [];

        return (
            <Modal
                visible={outfitModalVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closeOutfitModal}
            >
                <SafeAreaView style={styles.fullScreenModal} edges={['top']}>
                    <StatusBar barStyle="dark-content" />

                    {/* Full Screen Header with Back Button */}
                    <View style={styles.fullModalHeader}>
                        <TouchableOpacity
                            onPress={closeOutfitModal}
                            style={styles.backButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                        <View style={styles.fullModalHeaderCenter}>
                            <View style={[styles.modalDayIcon, { backgroundColor: occasionColor + '20' }]}>
                                <Ionicons name={iconName as any} size={22} color={occasionColor} />
                            </View>
                            <View>
                                <Text style={styles.fullModalTitle}>{selectedOutfit.day_of_week}</Text>
                                <Text style={styles.fullModalSubtitle}>{formatDate(selectedOutfit.date)}</Text>
                            </View>
                        </View>
                        <View style={styles.headerSpacer} />
                    </View>

                    <ScrollView
                        style={styles.fullModalScroll}
                        contentContainerStyle={styles.fullModalContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Occasion & Weather */}
                        <View style={styles.modalMeta}>
                            <View style={[styles.modalOccasionBadge, { backgroundColor: occasionColor + '15' }]}>
                                <Ionicons name="calendar-outline" size={14} color={occasionColor} />
                                <Text style={[styles.modalOccasionText, { color: occasionColor }]}>
                                    {selectedOutfit.occasion}
                                </Text>
                            </View>
                            {selectedOutfit.weather_summary && (
                                <View style={styles.modalWeatherBadge}>
                                    <Ionicons name="partly-sunny-outline" size={14} color={theme.colors.text.secondary} />
                                    <Text style={styles.modalWeatherText}>{selectedOutfit.weather_summary}</Text>
                                </View>
                            )}
                        </View>

                        {/* Outfit Items Grid */}
                        <Text style={styles.outfitSectionTitle}>Today's Outfit</Text>
                        <Text style={styles.tapHint}>Tap an item to view details or edit</Text>

                        <View style={styles.outfitItemsGrid}>
                            {outfitItems.map((itemId, index) => renderOutfitItemCard(itemId, index))}
                        </View>

                        {/* Style Notes */}
                        {selectedOutfit.style_notes && (
                            <View style={styles.modalStyleNotes}>
                                <View style={styles.styleNotesHeader}>
                                    <Ionicons name="bulb-outline" size={18} color={theme.colors.primary.solid} />
                                    <Text style={styles.styleNotesTitleModal}>Styling Tips</Text>
                                </View>
                                <Text style={styles.styleNotesTextModal}>{selectedOutfit.style_notes}</Text>
                            </View>
                        )}

                        {/* Try On Button */}
                        <TouchableOpacity
                            style={styles.modalTryOnButton}
                            onPress={() => {
                                closeOutfitModal();
                                navigation.navigate('TryOn', {
                                    itemIds: selectedOutfit.items,
                                    outfitId: selectedOutfit.id
                                });
                            }}
                        >
                            <LinearGradient
                                colors={[theme.colors.primary.start, theme.colors.primary.end]}
                                style={styles.modalTryOnGradient}
                            >
                                <Ionicons name="shirt" size={20} color="white" />
                                <Text style={styles.modalTryOnText}>Visual Try-On</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Bottom spacing */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        );
    };

    const renderEmptyState = () => (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <LinearGradient
                colors={[theme.colors.primary.start, theme.colors.primary.end]}
                style={styles.emptyIcon}
            >
                <Ionicons name="sparkles" size={48} color="white" />
            </LinearGradient>

            <Text style={styles.emptyTitle}>Your AI Stylist</Text>
            <Text style={styles.emptySubtitle}>
                Get personalized weekly outfit suggestions based on your wardrobe, weather, and occasions.
            </Text>

            <View style={styles.featureList}>
                <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.featureText}>Smart outfit combinations</Text>
                </View>
                <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.featureText}>Weather-appropriate suggestions</Text>
                </View>
                <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.featureText}>Occasion-based styling</Text>
                </View>
            </View>

            <Button
                title={generating ? "Generating your plan..." : "Generate Weekly Plan"}
                onPress={handleGeneratePlan}
                variant="primary"
                size="lg"
                fullWidth
                loading={generating}
                disabled={generating}
                icon={!generating && <Ionicons name="sparkles" size={20} color="white" />}
            />

            {wardrobeItems.size < 5 && (
                <Text style={styles.warningText}>
                    Add at least 5 items to your wardrobe to get started
                </Text>
            )}
        </Animated.View>
    );

    if (loading && !weekPlan && wardrobeItems.size === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Header title="Style AI" subtitle="Your personal AI stylist" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.solid} />
                    <Text style={styles.loadingText}>Loading your style plan...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Style AI" subtitle="Your personal AI stylist" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary.solid}
                    />
                }
            >
                {!weekPlan ? (
                    renderEmptyState()
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Plan Header */}
                        <View style={styles.planHeader}>
                            <View>
                                <Text style={styles.planTitle}>This Week's Looks</Text>
                                <Text style={styles.planDates}>
                                    {formatDate(weekPlan.start_date)} - {formatDate(weekPlan.end_date)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.regenerateButton}
                                onPress={handleGeneratePlan}
                                disabled={generating}
                            >
                                {generating ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary.solid} />
                                ) : (
                                    <>
                                        <Ionicons name="refresh" size={18} color={theme.colors.primary.solid} />
                                        <Text style={styles.regenerateText}>Refresh</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Daily Outfit Cards */}
                        {weekPlan.daily_outfits.map((day, index) => renderDayCard(day, index))}

                        {/* Bottom spacing for tab bar */}
                        <View style={{ height: 40 }} />
                    </Animated.View>
                )}
            </ScrollView>

            {/* Outfit Detail Modal */}
            {renderOutfitModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 140,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        ...theme.shadows.lg,
    },
    emptyTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    featureList: {
        width: '100%',
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    featureText: {
        fontSize: 16,
        color: theme.colors.text.primary,
    },
    warningText: {
        marginTop: 16,
        fontSize: 14,
        color: theme.colors.warning,
        textAlign: 'center',
    },

    // Plan Header
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    planTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text.primary,
    },
    planDates: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginTop: 4,
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.primary.solid + '10',
        borderRadius: 20,
    },
    regenerateText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },

    // Day Card
    dayCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        ...theme.shadows.md,
    },
    dayCardSelected: {
        borderWidth: 2,
        borderColor: theme.colors.primary.solid,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dayInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dayIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayName: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text.primary,
    },
    dayDate: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
        marginTop: 2,
    },
    occasionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    occasionText: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize',
    },

    // Weather
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    weatherText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },

    // Outfit Preview
    outfitPreview: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.neutral[100],
        paddingTop: 12,
    },
    thumbnailRow: {
        flexDirection: 'row',
        gap: 10,
    },
    itemThumbnail: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: theme.colors.neutral[100],
    },
    thumbnailPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: theme.colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreBadge: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: theme.colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    modalTryOnButton: {
        marginTop: 24,
        marginHorizontal: 20,
        marginBottom: 8,
        ...theme.shadows.md,
    },
    modalTryOnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    modalTryOnText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    noItemsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    noItemsText: {
        fontSize: 14,
        color: theme.colors.neutral[400],
    },

    // Style Notes
    styleNotes: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.neutral[100],
    },
    styleNotesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text.tertiary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    styleNotesText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 20,
    },

    // View Outfit Button
    viewOutfitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.neutral[100],
    },
    viewOutfitText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },

    // Full Screen Modal Styles
    fullScreenModal: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    fullModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral[100],
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.neutral[100],
    },
    fullModalHeaderCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fullModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text.primary,
    },
    fullModalSubtitle: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
        marginTop: 1,
    },
    headerSpacer: {
        width: 44,
    },
    fullModalScroll: {
        flex: 1,
    },
    fullModalContent: {
        padding: theme.spacing.lg,
    },
    modalDayIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalMeta: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    modalOccasionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modalOccasionText: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    modalWeatherBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: theme.colors.neutral[100],
    },
    modalWeatherText: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    outfitSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xs,
    },
    tapHint: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing.md,
    },
    outfitItemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    outfitItemCard: {
        width: OUTFIT_ITEM_SIZE,
        backgroundColor: theme.colors.neutral[50],
        borderRadius: 16,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    outfitItemImage: {
        width: '100%',
        height: OUTFIT_ITEM_SIZE,
        backgroundColor: theme.colors.neutral[100],
    },
    outfitItemImagePlaceholder: {
        width: '100%',
        height: OUTFIT_ITEM_SIZE,
        backgroundColor: theme.colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    outfitItemInfo: {
        padding: 12,
    },
    outfitItemCategory: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.primary,
        textTransform: 'capitalize',
    },
    outfitItemColor: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    tapIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    modalStyleNotes: {
        marginTop: theme.spacing.lg,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.primary.solid + '08',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary.solid,
    },
    styleNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    styleNotesTitleModal: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },
    styleNotesTextModal: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 20,
    },
});
