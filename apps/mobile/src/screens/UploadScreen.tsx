import React, { useState, useRef, useEffect } from 'react';
import { Image, View, StyleSheet, Alert, ActivityIndicator, Text, ScrollView, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { uploadWardrobeItem, bulkUploadWardrobeItems, BulkUploadResult } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import Button from '../components/Button';
import Header from '../components/Header';
import { theme } from '../styles/theme';
import { logger, logInteraction } from '../utils/logger';
import { processImageForUpload, processImagesForUpload } from '../utils/imageProcessor';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 3;

const AI_TIPS = [
    "Analyzing your item...",
    "Detecting colors and patterns...",
    "Identifying clothing type...",
    "Finding the perfect category...",
    "Almost there...",
];

const BULK_TIPS = [
    "Processing your items...",
    "AI is analyzing each piece...",
    "Detecting colors and styles...",
    "Categorizing your wardrobe...",
    "Almost done with batch...",
];

// Upload steps for progress tracking
type UploadStep = 'preparing' | 'removing_bg' | 'analyzing' | 'uploading' | 'saving' | 'complete';

interface UploadProgress {
    step: UploadStep;
    progress: number; // 0-100
    message: string;
}

const UPLOAD_STEPS: Record<UploadStep, { label: string; percent: number }> = {
    preparing: { label: 'Preparing image...', percent: 10 },
    removing_bg: { label: 'Removing background...', percent: 30 },
    analyzing: { label: 'AI analyzing style...', percent: 60 },
    uploading: { label: 'Uploading to cloud...', percent: 80 },
    saving: { label: 'Saving to wardrobe...', percent: 95 },
    complete: { label: 'Complete!', percent: 100 },
};

type UploadMode = 'single' | 'bulk';

export default function UploadScreen() {
    const { session, isLoading } = useAuth();
    const token = session?.access_token;
    const navigation = useNavigation<any>();
    const { subscription, canAddItems, itemsRemaining, refreshSubscription } = useSubscription();

    // Upload mode
    const [mode, setMode] = useState<UploadMode>('single');
    
    // Single upload state
    const [image, setImage] = useState<string | null>(null);
    
    // Bulk upload state
    const [images, setImages] = useState<string[]>([]);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
    
    // Upload progress tracking
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    
    // Shared state
    const [uploading, setUploading] = useState(false);
    const [aiTipIndex, setAiTipIndex] = useState(0);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        logger.debug('UploadScreen mounted');
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
        // Refresh subscription to get latest item count
        refreshSubscription();
    }, []);

    // Pulse animation for AI processing
    useEffect(() => {
        if (uploading) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            pulse.start();

            // Rotate AI tips
            const tips = mode === 'bulk' ? BULK_TIPS : AI_TIPS;
            const tipInterval = setInterval(() => {
                setAiTipIndex(prev => (prev + 1) % tips.length);
            }, 2000);

            return () => {
                pulse.stop();
                clearInterval(tipInterval);
            };
        }
    }, [uploading, mode]);

    // Animate progress bar when uploadProgress changes
    useEffect(() => {
        if (uploadProgress) {
            Animated.timing(progressAnim, {
                toValue: uploadProgress.progress,
                duration: 300,
                useNativeDriver: false, // width animation requires false
            }).start();
        } else {
            progressAnim.setValue(0);
        }
    }, [uploadProgress]);

    // Helper to update progress step
    const updateProgress = (step: UploadStep) => {
        const stepInfo = UPLOAD_STEPS[step];
        setUploadProgress({
            step,
            progress: stepInfo.percent,
            message: stepInfo.label,
        });
    };

    // Switch mode handler
    const switchMode = (newMode: UploadMode) => {
        if (uploading) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMode(newMode);
        setImage(null);
        setImages([]);
        setBulkProgress(null);
        setUploadProgress(null);
    };

    // Single image picker
    const pickImage = async () => {
        logInteraction.imageSelect('gallery');
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false, // Don't crop - we'll resize on upload
            quality: 1.0, // Keep original quality, we'll compress after
        });

        if (!result.canceled) {
            logger.debug('Image selected from gallery', { uri: result.assets[0].uri.slice(-30) });
            
            // Process image (resize) before displaying
            try {
                const processed = await processImageForUpload(result.assets[0].uri);
                logger.debug('Image processed', { 
                    width: processed.width, 
                    height: processed.height 
                });
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setImage(processed.uri);
            } catch (procError) {
                logger.warn('Image processing failed, using original');
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setImage(result.assets[0].uri);
            }
        } else {
            logger.debug('Image selection cancelled');
        }
    };

    // Multiple images picker
    const pickMultipleImages = async () => {
        logInteraction.imageSelect('gallery');
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 1.0, // Keep original quality, we'll compress after
        });

        if (!result.canceled && result.assets.length > 0) {
            const uris = result.assets.map(asset => asset.uri);
            logger.debug('Multiple images selected', { count: uris.length });
            
            // Process all images
            try {
                const processedImages = await processImagesForUpload(uris);
                const processedUris = processedImages.map(img => img.uri);
                logger.debug('Bulk images processed', { count: processedUris.length });
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setImages(processedUris);
            } catch (procError) {
                logger.warn('Bulk image processing failed, using originals');
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setImages(uris);
            }
        } else {
            logger.debug('Bulk selection cancelled');
        }
    };

    const takePhoto = async () => {
        logInteraction.imageSelect('camera');
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            logger.warn('Camera permission denied');
            Alert.alert('Permission Required', 'Camera access is needed to take photos');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: false, // Don't crop - we'll resize on upload
            quality: 1.0, // Keep original quality
        });

        if (!result.canceled) {
            logger.debug('Photo taken', { uri: result.assets[0].uri.slice(-30) });
            
            // Process image before using
            try {
                const processed = await processImageForUpload(result.assets[0].uri);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                if (mode === 'bulk') {
                    setImages(prev => [...prev, processed.uri].slice(0, 10));
                } else {
                    setImage(processed.uri);
                }
            } catch (procError) {
                logger.warn('Photo processing failed, using original');
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                if (mode === 'bulk') {
                    setImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
                } else {
                    setImage(result.assets[0].uri);
                }
            }
        }
    };

    // Remove image from bulk selection
    const removeImage = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // Single upload handler
    const handleUpload = async () => {
        logInteraction.buttonPress('Upload', 'UploadScreen');
        
        if (!image) {
            logger.warn('Upload attempted without image');
            Alert.alert('Error', 'Please select an image first');
            return;
        }

        if (!token) {
            logger.warn('Upload attempted without auth token');
            Alert.alert('Authentication Error', 'Please sign in to upload items');
            return;
        }

        // Check subscription limits
        if (!canAddItems) {
            logger.warn('Upload blocked - item limit reached');
            Alert.alert(
                'Upgrade to Premium',
                `You've reached your limit of ${subscription?.itemLimit || 10} items. Upgrade to Premium for unlimited items.`,
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Upgrade Now', onPress: () => navigation.navigate('Upgrade') },
                ]
            );
            return;
        }

        setUploading(true);
        setAiTipIndex(0);
        updateProgress('preparing');
        logger.info('Starting upload with AI analysis');
        const startTime = Date.now();
        
        try {
            // Simulate step progression for better UX
            // The actual processing happens on the server, but we show steps to user
            updateProgress('preparing');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            updateProgress('removing_bg');
            // Start the actual upload - server will do bg removal + AI analysis
            const uploadPromise = uploadWardrobeItem(image, token);
            
            // Simulate step progression while waiting for response
            await new Promise(resolve => setTimeout(resolve, 2000));
            updateProgress('analyzing');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            updateProgress('uploading');
            
            // Wait for the actual result
            const result = await uploadPromise;
            
            updateProgress('saving');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            updateProgress('complete');
            
            const duration = Date.now() - startTime;
            logger.info('Upload successful', { 
                itemId: result?.id, 
                category: result?.category,
                duration: `${duration}ms`
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setImage(null);
            setUploadProgress(null);
            
            // Refresh subscription to update item count
            refreshSubscription();
            
            // Show AI-detected info in success message
            const category = result?.category || 'item';
            const color = result?.color || '';
            const description = color ? `${color} ${category}` : category;
            
            Alert.alert(
                '✨ Item Added!', 
                `AI detected: ${description}\n\nYour wardrobe has been updated.`,
                [
                    { text: 'View Closet', onPress: () => navigation.navigate('Closet') },
                    { text: 'Add More', style: 'cancel' }
                ]
            );
        } catch (error) {
            const duration = Date.now() - startTime;
            let errorMessage = 'Failed to upload item';
            if (error instanceof Error) {
                errorMessage = error.message;
                // Check if it's a subscription limit error
                if (errorMessage.includes('limit') || errorMessage.includes('Upgrade')) {
                    Alert.alert(
                        'Upgrade to Premium',
                        errorMessage,
                        [
                            { text: 'Later', style: 'cancel' },
                            { text: 'Upgrade Now', onPress: () => navigation.navigate('Upgrade') },
                        ]
                    );
                    return;
                }
            }
            logger.error('Upload failed', { error: errorMessage, duration: `${duration}ms` });
            Alert.alert('Upload Failed', errorMessage);
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    // Bulk upload handler
    const handleBulkUpload = async () => {
        logInteraction.buttonPress('BulkUpload', 'UploadScreen');
        
        if (images.length === 0) {
            logger.warn('Bulk upload attempted without images');
            Alert.alert('Error', 'Please select at least one image');
            return;
        }

        if (!token) {
            logger.warn('Bulk upload attempted without auth token');
            Alert.alert('Authentication Error', 'Please sign in to upload items');
            return;
        }

        // Check subscription limits
        if (!canAddItems) {
            logger.warn('Bulk upload blocked - item limit reached');
            Alert.alert(
                'Upgrade to Premium',
                `You've reached your limit of ${subscription?.itemLimit || 10} items. Upgrade to Premium for unlimited items.`,
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Upgrade Now', onPress: () => navigation.navigate('Upgrade') },
                ]
            );
            return;
        }

        // Warn if some items will be skipped
        if (itemsRemaining < images.length && itemsRemaining !== Infinity) {
            Alert.alert(
                'Item Limit',
                `You can only add ${itemsRemaining} more item${itemsRemaining === 1 ? '' : 's'} on the free plan. Some items will be skipped. Upgrade to Premium for unlimited items.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue Anyway', onPress: () => performBulkUpload() },
                    { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') },
                ]
            );
            return;
        }

        performBulkUpload();
    };

    const performBulkUpload = async () => {
        if (!token) return;

        setUploading(true);
        setAiTipIndex(0);
        setBulkProgress({ current: 0, total: images.length });
        logger.info('Starting bulk upload', { imageCount: images.length });
        const startTime = Date.now();
        
        try {
            const result: BulkUploadResult = await bulkUploadWardrobeItems(
                images, 
                token,
                (progress) => {
                    setBulkProgress({ current: progress.current, total: progress.total });
                }
            );
            
            const duration = Date.now() - startTime;
            logger.info('Bulk upload complete', { 
                successful: result.summary.successCount,
                failed: result.summary.failCount,
                duration: `${duration}ms`
            });
            
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setImages([]);
            setBulkProgress(null);
            
            // Refresh subscription to update item count
            refreshSubscription();
            
            // Build result message
            let message = `Successfully added ${result.summary.successCount} items.`;
            if (result.summary.failCount > 0) {
                message += `\n\n${result.summary.failCount} items failed:`;
                result.failed.forEach(f => {
                    message += `\n• ${f.filename}: ${f.error}`;
                });
            }
            
            // Check if any were skipped due to limit
            if (result.summary.skippedDueToLimit && result.summary.skippedDueToLimit > 0) {
                message += `\n\n${result.summary.skippedDueToLimit} items skipped (limit reached).`;
            }
            
            Alert.alert(
                result.summary.failCount === 0 && !result.summary.skippedDueToLimit 
                    ? '✨ All Items Added!' 
                    : result.summary.skippedDueToLimit 
                        ? '📦 Limit Reached' 
                        : '⚠️ Partial Success',
                message,
                result.summary.skippedDueToLimit 
                    ? [
                        { text: 'View Closet', onPress: () => navigation.navigate('Closet') },
                        { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') }
                    ]
                    : [
                        { text: 'View Closet', onPress: () => navigation.navigate('Closet') },
                        { text: 'Add More', style: 'cancel' }
                    ]
            );
        } catch (error) {
            const duration = Date.now() - startTime;
            let errorMessage = 'Failed to upload items';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            logger.error('Bulk upload failed', { error: errorMessage, duration: `${duration}ms` });
            
            // Check for limit error
            const isLimitError = errorMessage.toLowerCase().includes('limit') || 
                                 errorMessage.toLowerCase().includes('upgrade');
            
            if (isLimitError) {
                Alert.alert(
                    'Item Limit Reached',
                    'Upgrade to Premium for unlimited wardrobe items.',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Upgrade Now', onPress: () => navigation.navigate('Upgrade') }
                    ]
                );
            } else {
                Alert.alert('Bulk Upload Failed', errorMessage);
            }
        } finally {
            setUploading(false);
            setBulkProgress(null);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.solid} />
            </View>
        );
    }

    if (!token) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Please sign in to upload items</Text>
            </View>
        );
    }

    const tips = mode === 'bulk' ? BULK_TIPS : AI_TIPS;
    const hasContent = mode === 'single' ? !!image : images.length > 0;

    // Render single image thumbnail for bulk mode
    const renderBulkImage = ({ item, index }: { item: string; index: number }) => (
        <View style={styles.bulkImageContainer}>
            <Image source={{ uri: item }} style={styles.bulkImage} />
            {!uploading && (
                <TouchableOpacity 
                    style={styles.removeImageButton} 
                    onPress={() => removeImage(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
            )}
            <View style={styles.bulkImageIndex}>
                <Text style={styles.bulkImageIndexText}>{index + 1}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header 
                title="Add to Wardrobe" 
                subtitle={mode === 'bulk' 
                    ? `Upload up to 10 items at once • ${images.length}/10 selected`
                    : "AI will automatically detect your item's details"
                } 
            />
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                    <TouchableOpacity 
                        style={[styles.modeButton, mode === 'single' && styles.modeButtonActive]}
                        onPress={() => switchMode('single')}
                        disabled={uploading}
                    >
                        <Ionicons 
                            name="image-outline" 
                            size={18} 
                            color={mode === 'single' ? 'white' : theme.colors.text.secondary} 
                        />
                        <Text style={[styles.modeButtonText, mode === 'single' && styles.modeButtonTextActive]}>
                            Single
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modeButton, mode === 'bulk' && styles.modeButtonActive]}
                        onPress={() => switchMode('bulk')}
                        disabled={uploading}
                    >
                        <Ionicons 
                            name="images-outline" 
                            size={18} 
                            color={mode === 'bulk' ? 'white' : theme.colors.text.secondary} 
                        />
                        <Text style={[styles.modeButtonText, mode === 'bulk' && styles.modeButtonTextActive]}>
                            Bulk (up to 10)
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Single Mode Image Picker */}
                {mode === 'single' && (
                    <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: uploading ? pulseAnim : 1 }] }]}>
                        <TouchableOpacity 
                            style={[styles.imageCard, image && styles.imageCardWithImage]} 
                            onPress={pickImage}
                            activeOpacity={0.9}
                            disabled={uploading}
                        >
                            {image ? (
                                <View>
                                    <Image source={{ uri: image }} style={styles.image} accessibilityLabel="Selected wardrobe item preview" />
                                    {uploading && uploadProgress ? (
                                        <LinearGradient
                                            colors={['rgba(139, 92, 246, 0.95)', 'rgba(236, 72, 153, 0.95)']}
                                            style={styles.aiOverlay}
                                        >
                                            <View style={styles.progressContainer}>
                                                {/* Step Icon */}
                                                <View style={styles.progressIconContainer}>
                                                    {uploadProgress.step === 'complete' ? (
                                                        <Ionicons name="checkmark-circle" size={48} color="white" />
                                                    ) : (
                                                        <ActivityIndicator size="large" color="white" />
                                                    )}
                                                </View>
                                                
                                                {/* Step Label */}
                                                <Text style={styles.progressStepText}>{uploadProgress.message}</Text>
                                                
                                                {/* Progress Bar */}
                                                <View style={styles.progressBarContainer}>
                                                    <View style={styles.progressBarBackground}>
                                                        <Animated.View 
                                                            style={[
                                                                styles.progressBarFill,
                                                                { 
                                                                    width: progressAnim.interpolate({
                                                                        inputRange: [0, 100],
                                                                        outputRange: ['0%', '100%'],
                                                                    })
                                                                }
                                                            ]} 
                                                        />
                                                    </View>
                                                    <Text style={styles.progressPercentText}>{uploadProgress.progress}%</Text>
                                                </View>
                                                
                                                {/* Step Indicators */}
                                                <View style={styles.stepsRow}>
                                                    {(['preparing', 'removing_bg', 'analyzing', 'uploading', 'complete'] as UploadStep[]).map((step, index) => {
                                                        const stepOrder = ['preparing', 'removing_bg', 'analyzing', 'uploading', 'saving', 'complete'];
                                                        const currentIndex = stepOrder.indexOf(uploadProgress.step);
                                                        const thisIndex = stepOrder.indexOf(step);
                                                        const isComplete = thisIndex < currentIndex;
                                                        const isCurrent = step === uploadProgress.step;
                                                        
                                                        return (
                                                            <View key={step} style={styles.stepIndicator}>
                                                                <View style={[
                                                                    styles.stepDot,
                                                                    isComplete && styles.stepDotComplete,
                                                                    isCurrent && styles.stepDotCurrent,
                                                                ]}>
                                                                    {isComplete && (
                                                                        <Ionicons name="checkmark" size={10} color="white" />
                                                                    )}
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    ) : (
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                                            style={styles.imageOverlay}
                                        >
                                            <View style={styles.changePhotoButton}>
                                                <Ionicons name="camera" size={18} color="white" />
                                                <Text style={styles.changeButtonText}>Change</Text>
                                            </View>
                                        </LinearGradient>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <View style={styles.placeholderIcon}>
                                        <Ionicons name="shirt-outline" size={40} color={theme.colors.primary.solid} />
                                    </View>
                                    <Text style={styles.placeholderText}>Add your clothing item</Text>
                                    <Text style={styles.placeholderHint}>AI will identify type, color & style</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Bulk Mode Image Grid */}
                {mode === 'bulk' && (
                    <Animated.View style={[styles.bulkContainer, { opacity: fadeAnim }]}>
                        {images.length > 0 ? (
                            <>
                                <FlatList
                                    data={images}
                                    renderItem={renderBulkImage}
                                    keyExtractor={(item, index) => `${item}-${index}`}
                                    numColumns={3}
                                    scrollEnabled={false}
                                    contentContainerStyle={styles.bulkGrid}
                                    columnWrapperStyle={styles.bulkRow}
                                />
                                {uploading && (
                                    <View style={styles.bulkProgressOverlay}>
                                        <LinearGradient
                                            colors={['rgba(139, 92, 246, 0.95)', 'rgba(236, 72, 153, 0.95)']}
                                            style={styles.bulkProgressContent}
                                        >
                                            <ActivityIndicator size="large" color="white" />
                                            <Text style={styles.bulkProgressText}>{tips[aiTipIndex]}</Text>
                                            {bulkProgress && (
                                                <Text style={styles.bulkProgressCount}>
                                                    Processing {bulkProgress.current + 1} of {bulkProgress.total}
                                                </Text>
                                            )}
                                            <View style={styles.sparklesRow}>
                                                <Ionicons name="sparkles" size={16} color="white" />
                                                <Text style={styles.aiLabel}>AI Batch Analysis</Text>
                                                <Ionicons name="sparkles" size={16} color="white" />
                                            </View>
                                        </LinearGradient>
                                    </View>
                                )}
                                {!uploading && images.length < 10 && (
                                    <TouchableOpacity style={styles.addMoreButton} onPress={pickMultipleImages}>
                                        <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary.solid} />
                                        <Text style={styles.addMoreText}>Add more images</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <TouchableOpacity 
                                style={styles.bulkPlaceholder} 
                                onPress={pickMultipleImages}
                                activeOpacity={0.9}
                            >
                                <View style={styles.placeholderIcon}>
                                    <Ionicons name="images-outline" size={40} color={theme.colors.primary.solid} />
                                </View>
                                <Text style={styles.placeholderText}>Select multiple items</Text>
                                <Text style={styles.placeholderHint}>Tap to choose up to 10 photos</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}

                {/* Quick Actions */}
                {!hasContent && (
                    <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
                        <TouchableOpacity 
                            style={styles.quickActionButton} 
                            onPress={mode === 'bulk' ? pickMultipleImages : pickImage}
                        >
                            <LinearGradient
                                colors={[theme.colors.primary.start, theme.colors.primary.end]}
                                style={styles.quickActionGradient}
                            >
                                <Ionicons name="images-outline" size={24} color="white" />
                            </LinearGradient>
                            <Text style={styles.quickActionLabel}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionButton} onPress={takePhoto}>
                            <LinearGradient
                                colors={[theme.colors.secondary.start, theme.colors.secondary.end]}
                                style={styles.quickActionGradient}
                            >
                                <Ionicons name="camera-outline" size={24} color="white" />
                            </LinearGradient>
                            <Text style={styles.quickActionLabel}>Camera</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* AI Info Card */}
                <Animated.View style={[styles.aiInfoCard, { opacity: fadeAnim }]}>
                    <View style={styles.aiInfoHeader}>
                        <Ionicons name="sparkles" size={20} color={theme.colors.primary.solid} />
                        <Text style={styles.aiInfoTitle}>
                            {mode === 'bulk' ? 'Bulk Smart Detection' : 'Smart Detection'}
                        </Text>
                    </View>
                    <Text style={styles.aiInfoText}>
                        {mode === 'bulk' 
                            ? 'Our AI will analyze all your items at once, detecting category, color, style, and pattern for each piece. Perfect for quickly digitizing your wardrobe!'
                            : "Our AI will automatically identify your item's category, color, style, pattern, and suggest occasions to wear it."
                        }
                    </Text>
                </Animated.View>

                {/* Upload Button */}
                {hasContent && (
                    <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
                        <Button
                            title={uploading 
                                ? (mode === 'bulk' ? `Processing ${images.length} items...` : "AI is analyzing...") 
                                : (mode === 'bulk' ? `Add ${images.length} Items to Wardrobe` : "Add to Wardrobe")
                            }
                            onPress={mode === 'bulk' ? handleBulkUpload : handleUpload}
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={uploading}
                            disabled={!hasContent || uploading}
                            icon={!uploading && <Ionicons name="sparkles" size={20} color="white" />}
                        />
                    </Animated.View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.secondary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 140,
    },
    headerSection: {
        marginBottom: theme.spacing.xl,
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
        marginTop: 6,
    },
    imageCard: {
        marginBottom: theme.spacing.xl,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'white',
        ...theme.shadows.lg,
    },
    imageCardWithImage: {
        backgroundColor: 'transparent',
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 24,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: theme.spacing.md,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    aiOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    },
    aiProcessingText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    // Progress bar styles
    progressContainer: {
        width: '85%',
        alignItems: 'center',
        paddingVertical: theme.spacing.lg,
    },
    progressIconContainer: {
        marginBottom: theme.spacing.md,
    },
    progressStepText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    progressBarContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    progressBarBackground: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 4,
    },
    progressPercentText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'right',
    },
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    stepIndicator: {
        alignItems: 'center',
    },
    stepDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotComplete: {
        backgroundColor: 'white',
    },
    stepDotCurrent: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 2,
        borderColor: 'white',
    },
    sparklesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    aiLabel: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.9,
    },
    changePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    changeButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    imagePlaceholder: {
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.neutral[50],
        borderRadius: 24,
        borderWidth: 2,
        borderColor: theme.colors.neutral[200],
        borderStyle: 'dashed',
    },
    placeholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary.solid + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    placeholderText: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    placeholderHint: {
        marginTop: 6,
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: theme.spacing.xl,
    },
    quickActionButton: {
        alignItems: 'center',
    },
    quickActionGradient: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.md,
    },
    quickActionLabel: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    aiInfoCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.sm,
    },
    aiInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    aiInfoTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    aiInfoText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 20,
    },
    buttonContainer: {
        marginTop: theme.spacing.md,
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    // Mode Toggle Styles
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.neutral[100],
        borderRadius: 12,
        padding: 4,
        marginBottom: theme.spacing.lg,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
    },
    modeButtonActive: {
        backgroundColor: theme.colors.primary.solid,
        ...theme.shadows.sm,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    modeButtonTextActive: {
        color: 'white',
    },
    // Bulk Upload Styles
    bulkContainer: {
        marginBottom: theme.spacing.xl,
    },
    bulkPlaceholder: {
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.neutral[50],
        borderRadius: 24,
        borderWidth: 2,
        borderColor: theme.colors.neutral[200],
        borderStyle: 'dashed',
    },
    bulkGrid: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: theme.spacing.sm,
        ...theme.shadows.md,
    },
    bulkRow: {
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    bulkImageContainer: {
        position: 'relative',
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
    },
    bulkImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    removeImageButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: 'white',
        borderRadius: 12,
        ...theme.shadows.sm,
    },
    bulkImageIndex: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bulkImageIndexText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    bulkProgressOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        overflow: 'hidden',
    },
    bulkProgressContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    bulkProgressText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    bulkProgressCount: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginTop: 8,
    },
    addMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    addMoreText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },
});
