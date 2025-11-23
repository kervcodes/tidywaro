import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getWardrobeItems } from '../services/api';

// TODO: Replace with real auth token from context/storage
const TEMP_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Im84ZjhqWjUxWjRDbDNGZ3giLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2RlZW1rZ29ha2pibG94cmNqZWZmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0NjMyMmE3Mi0yYTE1LTQ0ODUtYTU2Yy0zZTU2NDUxMmYyY2QiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYzODk4OTMzLCJpYXQiOjE3NjM4OTUzMzMsImVtYWlsIjoidGVzdHVzZXIxNzYzODk1MzMzNDYzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJ0ZXN0dXNlcjE3NjM4OTUzMzM0NjNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNDYzMjJhNzItMmExNS00NDg1LWE1NmMtM2U1NjQ1MTJmMmNkIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjM4OTUzMzN9XSwic2Vzc2lvbl9pZCI6ImFkYWQ4ZjM4LTk5Y2UtNGNhMC1hZmI4LTYzOWZkNTM4MjJlNyIsImlzX2Fub255bW91cyI6ZmFsc2V9.i4Rr4dF61AXpo77yyiKvs4ouHm0-zaT10nXuCt9ASaQ';

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
