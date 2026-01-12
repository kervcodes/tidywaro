import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Dimensions, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getWardrobeItems } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Header from '../components/Header';
import { theme } from '../styles/theme';
import { logger, logInteraction, logNavigation } from '../utils/logger';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - theme.spacing.xl * 2 - theme.spacing.md) / 2;

interface WardrobeItem {
    id: string;
    image_url: string;
    processed_image_url?: string;
    category: string;
}

const ALL_CATEGORY = 'All';

export default function ClosetScreen() {
    const { session, isLoading } = useAuth();
    const token = session?.access_token;
    const navigation = useNavigation<any>();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchItems = useCallback(async () => {
        if (!token) {
            logger.debug('No token available for fetching items');
            setLoading(false);
            setRefreshing(false);
            return;
        }

        logger.debug('Fetching wardrobe items...');
        try {
            const data = await getWardrobeItems(token);
            logger.info('Wardrobe items loaded', { count: data.length });
            setItems(data);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch items';
            logger.error('Failed to fetch wardrobe items', { error: errorMessage });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    // Refetch items when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            logger.debug('ClosetScreen focused');
            if (!isLoading) {
                fetchItems();
            }
        }, [fetchItems, isLoading])
    );

    const onRefresh = useCallback(() => {
        logger.debug('Refreshing wardrobe items');
        setRefreshing(true);
        fetchItems();
    }, [fetchItems]);

    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category));
        return [ALL_CATEGORY, ...Array.from(cats)];
    }, [items]);

    const filteredItems = useMemo(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (selectedCategory === ALL_CATEGORY) return items;
        return items.filter(i => i.category === selectedCategory);
    }, [items, selectedCategory]);

    const renderItem = ({ item }: { item: WardrobeItem }) => (
        <TouchableOpacity 
            style={styles.itemWrapper}
            activeOpacity={0.8}
            onPress={() => {
                logInteraction.itemSelect(item.id);
                logNavigation.navigate('ItemDetail', { itemId: item.id });
                navigation.navigate('ItemDetail', { itemId: item.id });
            }}
        >
            <Card variant="solid" elevation="sm" style={styles.itemCard}>
                <Image
                    source={{ uri: item.processed_image_url || item.image_url }}
                    style={styles.image}
                    resizeMode="cover"
                    accessibilityLabel={`Wardrobe item: ${item.category}`}
                />
                <View style={styles.itemFooter}>
                    <Text style={styles.itemCategory} numberOfLines={1}>{item.category}</Text>
                </View>
            </Card>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View>
            <Header 
                title="Your Wardrobe" 
                subtitle={`${items.length} ${items.length === 1 ? 'piece' : 'pieces'}`} 
            />

            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            selectedCategory === item && styles.categoryChipActive
                        ]}
                        onPress={() => setSelectedCategory(item)}
                    >
                        <Text style={[
                            styles.categoryChipText,
                            selectedCategory === item && styles.categoryChipTextActive
                        ]}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    if (isLoading || loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary.solid} />
            </View>
        );
    }

    if (!token) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Authentication required.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Animated.FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.list}
                columnWrapperStyle={styles.columnWrapper}
                ListHeaderComponent={renderHeader}
                style={{ opacity: fadeAnim }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary.solid}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="shirt-outline" size={64} color={theme.colors.neutral[300]} />
                        <Text style={styles.emptyText}>
                            {selectedCategory === ALL_CATEGORY
                                ? "Your closet is empty. Start uploading!"
                                : `No ${selectedCategory} found.`}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.secondary,
    },
    categoriesSection: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    categoriesList: {
        gap: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
    },
    categoryChip: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 2,
        borderRadius: theme.borderRadius.full,
        backgroundColor: 'white',
        marginRight: 8,
        ...theme.shadows.sm,
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primary.solid,
    },
    categoryChipText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    categoryChipTextActive: {
        color: theme.colors.text.inverse,
    },
    list: {
        padding: theme.spacing.lg,
        paddingBottom: 120, // Space for floating tab bar
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemWrapper: {
        width: COLUMN_WIDTH,
        marginBottom: theme.spacing.lg,
    },
    itemCard: {
        padding: 0,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: 'white',
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
    },
    itemFooter: {
        padding: theme.spacing.md,
        backgroundColor: 'white',
        borderBottomLeftRadius: theme.borderRadius.xl,
        borderBottomRightRadius: theme.borderRadius.lg,
    },
    itemCategory: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.fontWeight.medium,
        textTransform: 'capitalize',
        textAlign: 'center',
    },
    errorText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing['4xl'],
    },
    emptyText: {
        marginTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.tertiary,
        textAlign: 'center',
    },
});
