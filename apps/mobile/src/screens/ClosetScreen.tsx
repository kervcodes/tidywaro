import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getWardrobeItems } from '../services/api';
import { useAuth } from '../contexts/AuthContext';


interface WardrobeItem {
    id: string;
    image_url: string;
    processed_image_url?: string;
    category: string;
}

export default function ClosetScreen() {
    const { token, isLoading } = useAuth();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchItems = useCallback(async () => {
        if (!token) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const data = await getWardrobeItems(token);
            setItems(data);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch items';
            console.error(errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        if (!isLoading) {
            fetchItems();
        }
    }, [fetchItems, isLoading]);

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
                accessibilityLabel={`Wardrobe item: ${item.category}`}
            />
            <Text style={styles.category}>{item.category}</Text>
        </View>
    );

    if (isLoading || loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!token) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Authentication required. Please set up authentication.</Text>
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
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});
