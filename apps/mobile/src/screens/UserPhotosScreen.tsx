import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import {
    getTryOnPhotos,
    uploadTryOnPhoto,
    deleteTryOnPhoto,
    setDefaultTryOnPhoto,
    TryOnUserPhoto,
} from '../services/api';
import Header from '../components/Header';
import Button from '../components/Button';
import { theme } from '../styles/theme';
import { logger } from '../utils/logger';

const MAX_PHOTOS = 3;

export default function UserPhotosScreen() {
    const navigation = useNavigation<any>();
    const { session } = useAuth();
    const token = session?.access_token;

    const [photos, setPhotos] = useState<TryOnUserPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Load photos on screen focus
    useFocusEffect(
        useCallback(() => {
            if (token) {
                loadPhotos();
            }
        }, [token])
    );

    const loadPhotos = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await getTryOnPhotos(token);
            setPhotos(data);
            logger.info('Loaded try-on photos', { count: data.length });
        } catch (error: any) {
            logger.error('Failed to load photos', { error: error.message });
            Alert.alert('Error', 'Could not load your photos');
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert(
                'Photo Limit Reached',
                `You can only have ${MAX_PHOTOS} photos. Please delete one to add a new photo.`
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri);
        }
    };

    const handleTakePhoto = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert(
                'Photo Limit Reached',
                `You can only have ${MAX_PHOTOS} photos. Please delete one to add a new photo.`
            );
            return;
        }

        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri: string) => {
        if (!token) return;

        try {
            setUploading(true);
            const photo = await uploadTryOnPhoto(uri, token);
            setPhotos(prev => [...prev, photo]);
            logger.info('Photo uploaded', { photoId: photo.id });
        } catch (error: any) {
            logger.error('Photo upload failed', { error: error.message });
            Alert.alert('Upload Failed', error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = (photo: TryOnUserPhoto) => {
        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deletePhoto(photo.id),
                },
            ]
        );
    };

    const deletePhoto = async (photoId: string) => {
        if (!token) return;

        try {
            setActionLoading(photoId);
            await deleteTryOnPhoto(photoId, token);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            logger.info('Photo deleted', { photoId });
        } catch (error: any) {
            logger.error('Delete failed', { error: error.message });
            Alert.alert('Delete Failed', error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSetDefault = async (photo: TryOnUserPhoto) => {
        if (!token || photo.is_default) return;

        try {
            setActionLoading(photo.id);
            await setDefaultTryOnPhoto(photo.id, token);
            setPhotos(prev =>
                prev.map(p => ({
                    ...p,
                    is_default: p.id === photo.id,
                }))
            );
            logger.info('Default photo set', { photoId: photo.id });
        } catch (error: any) {
            logger.error('Set default failed', { error: error.message });
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const renderPhoto = ({ item }: { item: TryOnUserPhoto }) => {
        const isLoading = actionLoading === item.id;

        return (
            <View style={styles.photoCard}>
                <Image
                    source={{ uri: item.thumbnail_url || item.image_url }}
                    style={styles.photoImage}
                    resizeMode="cover"
                />

                {item.is_default && (
                    <View style={styles.defaultBadge}>
                        <Ionicons name="star" size={12} color="white" />
                        <Text style={styles.defaultText}>Default</Text>
                    </View>
                )}

                {isLoading ? (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="white" />
                    </View>
                ) : (
                    <View style={styles.photoActions}>
                        {!item.is_default && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleSetDefault(item)}
                            >
                                <Ionicons name="star-outline" size={20} color={theme.colors.primary.solid} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDelete(item)}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderAddButton = () => {
        if (photos.length >= MAX_PHOTOS) return null;

        return (
            <TouchableOpacity
                style={styles.addCard}
                onPress={() => {
                    Alert.alert(
                        'Add Photo',
                        'Choose how to add your full-body photo',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Take Photo', onPress: handleTakePhoto },
                            { text: 'Choose from Gallery', onPress: handlePickImage },
                        ]
                    );
                }}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary.solid} />
                ) : (
                    <>
                        <Ionicons name="add-circle-outline" size={48} color={theme.colors.primary.solid} />
                        <Text style={styles.addText}>Add Photo</Text>
                        <Text style={styles.addSubtext}>
                            {photos.length}/{MAX_PHOTOS} photos
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="My Photos"
                subtitle="Photos for virtual try-on"
                showBack
                onBack={() => navigation.goBack()}
            />

            <View style={styles.content}>
                {/* Instructions */}
                <View style={styles.instructions}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.colors.neutral[500]} />
                    <Text style={styles.instructionText}>
                        Upload up to {MAX_PHOTOS} full-body photos for realistic virtual try-on. 
                        Stand in a neutral pose with good lighting for best results.
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary.solid} />
                        <Text style={styles.loadingText}>Loading photos...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={photos}
                        renderItem={renderPhoto}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        ListHeaderComponent={renderAddButton}
                        ListEmptyComponent={
                            !uploading ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="camera-outline" size={64} color={theme.colors.neutral[300]} />
                                    <Text style={styles.emptyText}>No photos yet</Text>
                                    <Text style={styles.emptySubtext}>
                                        Add a full-body photo to use AI try-on
                                    </Text>
                                </View>
                            ) : null
                        }
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    instructions: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.primary.solid + '10',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    instructionText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.neutral[600],
        lineHeight: 18,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: theme.colors.neutral[500],
    },
    listContent: {
        flexGrow: 1,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    photoCard: {
        width: '48%',
        aspectRatio: 3 / 4,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[100],
    },
    photoImage: {
        width: '100%',
        height: '100%',
    } as const,
    defaultBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary.solid,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    defaultText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'white',
    },
    photoActions: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    deleteButton: {
        backgroundColor: theme.colors.error + '15',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addCard: {
        width: '48%',
        aspectRatio: 3 / 4,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.primary.solid + '50',
        backgroundColor: theme.colors.primary.solid + '05',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    addText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary.solid,
        marginTop: 8,
    },
    addSubtext: {
        fontSize: 12,
        color: theme.colors.neutral[500],
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.neutral[400],
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.colors.neutral[400],
        marginTop: 4,
        textAlign: 'center',
    },
});
