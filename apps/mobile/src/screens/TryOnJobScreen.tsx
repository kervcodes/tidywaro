import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
    getTryOnPhotos,
    getTryOnCredits,
    createTryOnJob,
    pollTryOnJob,
    TryOnUserPhoto,
    TryOnCreditsInfo,
    TryOnJob,
} from '../services/api';
import Header from '../components/Header';
import Button from '../components/Button';
import { theme } from '../styles/theme';
import { logger } from '../utils/logger';

interface RouteParams {
    itemIds: string[];
    outfitId?: string;
}

export default function TryOnJobScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { itemIds = [], outfitId } = (route.params as RouteParams) || {};
    const { session } = useAuth();
    const token = session?.access_token;

    // State
    const [photos, setPhotos] = useState<TryOnUserPhoto[]>([]);
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [credits, setCredits] = useState<TryOnCreditsInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [currentJob, setCurrentJob] = useState<TryOnJob | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    // Load data on focus
    useFocusEffect(
        useCallback(() => {
            if (token) {
                loadData();
            }
        }, [token])
    );

    const loadData = async () => {
        if (!token) return;

        try {
            setLoading(true);
            const [photosData, creditsData] = await Promise.all([
                getTryOnPhotos(token),
                getTryOnCredits(token),
            ]);

            setPhotos(photosData);
            setCredits(creditsData);

            // Auto-select default photo
            const defaultPhoto = photosData.find(p => p.is_default);
            if (defaultPhoto) {
                setSelectedPhotoId(defaultPhoto.id);
            } else if (photosData.length > 0) {
                setSelectedPhotoId(photosData[0].id);
            }

            logger.info('Loaded try-on data', {
                photoCount: photosData.length,
                credits: creditsData.tryon_credits_balance,
            });
        } catch (error: any) {
            logger.error('Failed to load try-on data', { error: error.message });
            Alert.alert('Error', 'Could not load try-on data');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!token) {
            Alert.alert('Error', 'Please sign in');
            return;
        }

        if (!selectedPhotoId) {
            Alert.alert('No Photo Selected', 'Please select a photo or add one first.');
            return;
        }

        if (!credits || credits.tryon_credits_balance <= 0) {
            Alert.alert(
                'No Credits',
                'You need try-on credits to generate. Upgrade your plan for more credits!',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') },
                ]
            );
            return;
        }

        if (itemIds.length === 0) {
            Alert.alert('No Items', 'No clothing items selected for try-on');
            return;
        }

        try {
            setGenerating(true);
            setResultImage(null);

            // Create job
            logger.info('Creating try-on job', { photoId: selectedPhotoId, itemCount: itemIds.length });
            const job = await createTryOnJob(selectedPhotoId, itemIds, token);
            setCurrentJob(job);

            // Update credits display
            if (credits) {
                setCredits({
                    ...credits,
                    tryon_credits_balance: credits.tryon_credits_balance - job.credits_charged,
                    tryon_credits_used: credits.tryon_credits_used + job.credits_charged,
                });
            }

            // Poll for completion
            const completedJob = await pollTryOnJob(
                job.id,
                token,
                (updatedJob) => {
                    setCurrentJob(updatedJob);
                    logger.debug('Job progress', { status: updatedJob.status });
                }
            );

            if (completedJob.status === 'completed' && completedJob.result_image_url) {
                setResultImage(completedJob.result_image_url);
                logger.info('Try-on completed', { jobId: completedJob.id });
            } else if (completedJob.status === 'failed') {
                // Credits are refunded by the worker
                Alert.alert(
                    'Generation Failed',
                    completedJob.error_message || 'Please try again later. Your credits have been refunded.'
                );
                // Refresh credits to show refund
                loadData();
            }
        } catch (error: any) {
            logger.error('Try-on generation failed', { error: error.message });
            Alert.alert('Error', error.message);
            // Refresh to get accurate credit balance
            loadData();
        } finally {
            setGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!resultImage) return;

        try {
            await Share.share({
                message: 'Check out this virtual try-on from Tidywaro!',
                url: resultImage,
            });
        } catch (error) {
            logger.error('Share failed', { error });
        }
    };

    const handleAddPhoto = () => {
        navigation.navigate('UserPhotos');
    };

    const renderPhotoSelector = () => (
        <View style={styles.photoSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Photo</Text>
                <TouchableOpacity onPress={handleAddPhoto}>
                    <Text style={styles.manageLink}>Manage Photos</Text>
                </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
                <TouchableOpacity style={styles.noPhotoCard} onPress={handleAddPhoto}>
                    <Ionicons name="person-add-outline" size={32} color={theme.colors.primary.solid} />
                    <Text style={styles.noPhotoText}>Add a full-body photo</Text>
                    <Text style={styles.noPhotoSubtext}>Required for AI try-on</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.photoList}
                >
                    {photos.map(photo => (
                        <TouchableOpacity
                            key={photo.id}
                            style={[
                                styles.photoThumb,
                                selectedPhotoId === photo.id && styles.photoThumbSelected,
                            ]}
                            onPress={() => setSelectedPhotoId(photo.id)}
                        >
                            <Image
                                source={{ uri: photo.thumbnail_url || photo.image_url }}
                                style={styles.photoThumbImage}
                            />
                            {photo.is_default && (
                                <View style={styles.defaultIndicator}>
                                    <Ionicons name="star" size={10} color="white" />
                                </View>
                            )}
                            {selectedPhotoId === photo.id && (
                                <View style={styles.selectedOverlay}>
                                    <Ionicons name="checkmark-circle" size={24} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    const renderCredits = () => (
        <View style={styles.creditsSection}>
            <View style={styles.creditsBadge}>
                <Ionicons name="flash" size={16} color={theme.colors.warning} />
                <Text style={styles.creditsText}>
                    {credits?.tryon_credits_balance ?? '...'} credits
                </Text>
            </View>
            {credits && credits.tryon_credits_balance <= 2 && (
                <TouchableOpacity onPress={() => navigation.navigate('Upgrade')}>
                    <Text style={styles.upgradeLink}>Get more</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderGenerating = () => (
        <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.solid} />
            <Text style={styles.generatingText}>
                {currentJob?.status === 'pending' && 'Queued...'}
                {currentJob?.status === 'processing' && 'Generating try-on...'}
            </Text>
            <Text style={styles.generatingSubtext}>This may take 1-2 minutes</Text>
        </View>
    );

    const renderResult = () => (
        <View style={styles.resultContainer}>
            <Image
                source={{ uri: resultImage! }}
                style={styles.resultImage}
                resizeMode="contain"
            />
            <View style={styles.resultActions}>
                <View style={styles.buttonWrapper}>
                    <Button
                        title="Share"
                        variant="secondary"
                        onPress={handleShare}
                        icon={<Ionicons name="share-outline" size={18} color={theme.colors.primary.solid} />}
                        fullWidth
                    />
                </View>
                <View style={styles.buttonWrapper}>
                    <Button
                        title="New Try-On"
                        variant="primary"
                        onPress={() => setResultImage(null)}
                        icon={<Ionicons name="refresh-outline" size={18} color="white" />}
                        fullWidth
                    />
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Header title="AI Try-On" showBack onBack={() => navigation.goBack()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.solid} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="AI Try-On"
                subtitle={`${itemIds.length} items selected`}
                showBack
                onBack={() => navigation.goBack()}
            />

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {renderCredits()}
                {renderPhotoSelector()}

                <View style={styles.resultSection}>
                    {generating ? (
                        renderGenerating()
                    ) : resultImage ? (
                        renderResult()
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="shirt-outline" size={64} color={theme.colors.neutral[300]} />
                            <Text style={styles.placeholderText}>
                                Select your photo and tap Generate to see the outfit on you!
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {!resultImage && !generating && (
                <View style={styles.footer}>
                    <Button
                        title={`Generate Try-On (1 credit)`}
                        variant="primary"
                        onPress={handleGenerate}
                        disabled={!selectedPhotoId || !credits || credits.tryon_credits_balance <= 0}
                        icon={<Ionicons name="sparkles" size={18} color="white" />}
                        fullWidth
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    creditsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.warning + '15',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    creditsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    creditsText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.neutral[700],
    },
    upgradeLink: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },
    photoSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.neutral[800],
    },
    manageLink: {
        fontSize: 14,
        color: theme.colors.primary.solid,
    },
    photoList: {
        gap: 12,
    },
    photoThumb: {
        width: 80,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    photoThumbSelected: {
        borderColor: theme.colors.primary.solid,
    },
    photoThumbImage: {
        width: '100%',
        height: '100%',
    } as const,
    defaultIndicator: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: theme.colors.primary.solid,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noPhotoCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.primary.solid + '50',
        backgroundColor: theme.colors.primary.solid + '05',
        alignItems: 'center',
    },
    noPhotoText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.primary.solid,
        marginTop: 8,
    },
    noPhotoSubtext: {
        fontSize: 13,
        color: theme.colors.neutral[500],
        marginTop: 4,
    },
    resultSection: {
        flex: 1,
        minHeight: 300,
    },
    generatingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    generatingText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.neutral[700],
        marginTop: 16,
    },
    generatingSubtext: {
        fontSize: 13,
        color: theme.colors.neutral[500],
        marginTop: 4,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    placeholderText: {
        fontSize: 14,
        color: theme.colors.neutral[500],
        textAlign: 'center',
        marginTop: 16,
        maxWidth: 280,
    },
    resultContainer: {
        flex: 1,
    },
    resultImage: {
        width: '100%',
        aspectRatio: 3 / 4,
        borderRadius: 16,
        backgroundColor: theme.colors.neutral[100],
    } as const,
    resultActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    buttonWrapper: {
        flex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32,
        backgroundColor: theme.colors.background.primary,
        borderTopWidth: 1,
        borderTopColor: theme.colors.neutral[100],
    },
});
