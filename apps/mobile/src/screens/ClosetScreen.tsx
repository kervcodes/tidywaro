import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getWardrobeItems } from '../services/api';

// TODO: Replace with real auth token from context/storage
const TEMP_TOKEN = process.env.EXPO_PUBLIC_TEMP_TOKEN || '';

interface WardrobeItem {
    id: string;
    image_url: string;
    processed_image_url?: string;
    category: string;
}

export default function ClosetScreen() {
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchItems = useCallback(async () => {
        try {
            const data = await getWardrobeItems(TEMP_TOKEN);
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch items', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchItems();
    }, [fetchItems]);

    const renderItem = ({ item }: { item: WardrobeItem }) => (
        <View style={styles.itemContainer}>
            <Image
                source={{ uri: item.processed_image_url || item.image_url }}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel={`${item.category} wardrobe item`}
            />
            <Text style={styles.category}>{item.category}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text>No items yet. Upload some!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 10,
    },
    itemContainer: {
        flex: 1,
        margin: 5,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        overflow: 'hidden',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        aspectRatio: 1, // Square images
    },
    category: {
        padding: 5,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
});
