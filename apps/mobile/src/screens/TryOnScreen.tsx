import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    TouchableOpacity,
    Alert,
    PanResponder,
    Animated,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getWardrobeItems, generateOutfitTryOn, TryOnResult } from '../services/api';
import Header from '../components/Header';
import Button from '../components/Button';
import { theme } from '../styles/theme';
import { logger } from '../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_HEIGHT = SCREEN_HEIGHT * 0.65;

// Category-based positioning configuration (relative to avatar)
const CATEGORY_POSITIONS: { [key: string]: { top: number; left: number; width: number; height: number; zIndex: number } } = {
    // Tops
    't-shirt': { top: 0.18, left: 0.15, width: 0.7, height: 0.28, zIndex: 10 },
    'shirt': { top: 0.16, left: 0.12, width: 0.76, height: 0.30, zIndex: 10 },
    'blouse': { top: 0.16, left: 0.12, width: 0.76, height: 0.30, zIndex: 10 },
    'sweater': { top: 0.15, left: 0.10, width: 0.80, height: 0.32, zIndex: 10 },
    'hoodie': { top: 0.12, left: 0.08, width: 0.84, height: 0.35, zIndex: 10 },
    'jacket': { top: 0.14, left: 0.06, width: 0.88, height: 0.38, zIndex: 15 },
    'coat': { top: 0.12, left: 0.04, width: 0.92, height: 0.50, zIndex: 15 },
    'blazer': { top: 0.14, left: 0.08, width: 0.84, height: 0.36, zIndex: 15 },
    'top': { top: 0.18, left: 0.15, width: 0.70, height: 0.26, zIndex: 10 },
    'tank top': { top: 0.18, left: 0.18, width: 0.64, height: 0.24, zIndex: 10 },
    'cardigan': { top: 0.15, left: 0.08, width: 0.84, height: 0.36, zIndex: 12 },

    // Bottoms
    'pants': { top: 0.42, left: 0.18, width: 0.64, height: 0.42, zIndex: 5 },
    'jeans': { top: 0.42, left: 0.18, width: 0.64, height: 0.42, zIndex: 5 },
    'trousers': { top: 0.42, left: 0.18, width: 0.64, height: 0.42, zIndex: 5 },
    'shorts': { top: 0.42, left: 0.20, width: 0.60, height: 0.22, zIndex: 5 },
    'skirt': { top: 0.42, left: 0.18, width: 0.64, height: 0.28, zIndex: 5 },

    // Full body
    'dress': { top: 0.16, left: 0.12, width: 0.76, height: 0.55, zIndex: 8 },
    'jumpsuit': { top: 0.16, left: 0.12, width: 0.76, height: 0.68, zIndex: 8 },
    'romper': { top: 0.16, left: 0.12, width: 0.76, height: 0.45, zIndex: 8 },

    // Footwear
    'shoes': { top: 0.85, left: 0.22, width: 0.56, height: 0.12, zIndex: 3 },
    'sneakers': { top: 0.85, left: 0.22, width: 0.56, height: 0.12, zIndex: 3 },
    'boots': { top: 0.82, left: 0.22, width: 0.56, height: 0.15, zIndex: 3 },
    'heels': { top: 0.85, left: 0.22, width: 0.56, height: 0.12, zIndex: 3 },
    'sandals': { top: 0.86, left: 0.22, width: 0.56, height: 0.10, zIndex: 3 },

    // Accessories
    'hat': { top: 0.02, left: 0.25, width: 0.50, height: 0.14, zIndex: 20 },
    'cap': { top: 0.02, left: 0.25, width: 0.50, height: 0.12, zIndex: 20 },
    'scarf': { top: 0.14, left: 0.20, width: 0.60, height: 0.15, zIndex: 18 },
    'bag': { top: 0.35, left: 0.60, width: 0.35, height: 0.30, zIndex: 25 },
    'watch': { top: 0.38, left: 0.02, width: 0.15, height: 0.10, zIndex: 25 },
    'belt': { top: 0.41, left: 0.22, width: 0.56, height: 0.06, zIndex: 12 },
    'glasses': { top: 0.08, left: 0.28, width: 0.44, height: 0.08, zIndex: 25 },
    'sunglasses': { top: 0.08, left: 0.28, width: 0.44, height: 0.08, zIndex: 25 },

    // Default fallback
    'default': { top: 0.25, left: 0.15, width: 0.70, height: 0.35, zIndex: 10 },
};

// Get position config based on category/subcategory
const getPositionConfig = (category: string, subcategory?: string) => {
    const lowerSub = (subcategory || '').toLowerCase();
    const lowerCat = (category || '').toLowerCase();

    // Try subcategory first, then category, then default
    if (CATEGORY_POSITIONS[lowerSub]) return CATEGORY_POSITIONS[lowerSub];
    if (CATEGORY_POSITIONS[lowerCat]) return CATEGORY_POSITIONS[lowerCat];

    // Try to match partial
    for (const key of Object.keys(CATEGORY_POSITIONS)) {
        if (lowerSub.includes(key) || lowerCat.includes(key)) {
            return CATEGORY_POSITIONS[key];
        }
    }

    return CATEGORY_POSITIONS['default'];
};

interface ClothingItem {
    id: string;
    category: string;
    subcategory?: string;
    color?: string;
    image_url: string;
    processed_image_url?: string;
}

// Draggable clothing layer component
const DraggableClothingLayer = ({
    item,
    canvasWidth,
    canvasHeight,
    isSelected,
    onSelect,
}: {
    item: ClothingItem;
    canvasWidth: number;
    canvasHeight: number;
    isSelected: boolean;
    onSelect: () => void;
}) => {
    const config = getPositionConfig(item.category, item.subcategory);

    const initialX = config.left * canvasWidth;
    const initialY = config.top * canvasHeight;
    const itemWidth = config.width * canvasWidth;
    const itemHeight = config.height * canvasHeight;

    const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
    const scale = useRef(new Animated.Value(1)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                onSelect();
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value,
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            },
        })
    ).current;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.clothingLayer,
                {
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: scale },
                    ],
                    width: itemWidth,
                    height: itemHeight,
                    zIndex: config.zIndex,
                },
                isSelected && styles.clothingLayerSelected,
            ]}
        >
            <Image
                source={{ uri: item.processed_image_url || item.image_url }}
                style={styles.clothingImage}
                resizeMode="contain"
            />
            {isSelected && (
                <View style={styles.selectedIndicator}>
                    <Ionicons name="move" size={16} color="white" />
                </View>
            )}
        </Animated.View>
    );
};

export default function TryOnScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { session, selectedAvatar } = useAuth();
    const token = session?.access_token;

    const { itemIds = [], outfitId } = route.params || {};

    const [items, setItems] = useState<ClothingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH - 32, height: CANVAS_HEIGHT });
    
    // AI Try-On state
    const [mode, setMode] = useState<'overlay' | 'ai'>('overlay');
    const [generating, setGenerating] = useState(false);
    const [aiTryOnImage, setAiTryOnImage] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        loadItems();
    }, [itemIds]);

    const loadItems = async () => {
        if (!token) return;
        try {
            const allItems = await getWardrobeItems(token);
            const outfitItems = allItems.filter((i: ClothingItem) => itemIds.includes(i.id));

            // Sort by z-index (lower items first so they render behind)
            outfitItems.sort((a: ClothingItem, b: ClothingItem) => {
                const aConfig = getPositionConfig(a.category, a.subcategory);
                const bConfig = getPositionConfig(b.category, b.subcategory);
                return aConfig.zIndex - bConfig.zIndex;
            });

            setItems(outfitItems);
            logger.info('Loaded try-on items', { count: outfitItems.length });
        } catch (error) {
            logger.error('Failed to load try-on items', { error });
            Alert.alert('Error', 'Could not load outfit items');
        } finally {
            setLoading(false);
        }
    };

    const getAvatarSource = () => {
        if (!selectedAvatar) return null;

        if (selectedAvatar === 'avatar_female_1') return require('../../assets/models/avatar_female_1.png');
        if (selectedAvatar === 'avatar_male_1') return require('../../assets/models/avatar_male_1.png');

        return { uri: selectedAvatar };
    };

    const getAvatarUrl = (): string | null => {
        if (!selectedAvatar) return null;
        
        // For custom uploads, return the URI
        if (selectedAvatar.startsWith('file://') || selectedAvatar.startsWith('content://') || selectedAvatar.startsWith('http')) {
            return selectedAvatar;
        }
        
        // For built-in avatars, we need to use a hosted URL
        // In production, these should be hosted URLs
        // For now, return null to indicate we need a custom photo
        return null;
    };

    const avatarSource = getAvatarSource();

    const handleCanvasLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        setCanvasLayout({ width, height });
    };

    const handleGenerateAITryOn = async () => {
        if (!token) {
            Alert.alert('Error', 'Please sign in to use AI try-on');
            return;
        }

        const modelUrl = getAvatarUrl();
        if (!modelUrl) {
            Alert.alert(
                'Custom Photo Required', 
                'AI Try-On works best with your own photo. Please select a custom model photo.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Select Photo', onPress: () => navigation.navigate('ModelSelection') }
                ]
            );
            return;
        }

        if (items.length === 0) {
            Alert.alert('No Items', 'No clothing items to try on');
            return;
        }

        setGenerating(true);
        setAiError(null);
        
        try {
            logger.info('Starting AI try-on generation', { itemCount: items.length });
            
            const garments = items.map(item => ({
                url: item.processed_image_url || item.image_url,
                category: item.category,
                subcategory: item.subcategory,
            }));

            const result: TryOnResult = await generateOutfitTryOn(modelUrl, garments, token);

            if (result.success && result.imageUrl) {
                setAiTryOnImage(result.imageUrl);
                setMode('ai');
                logger.info('AI try-on generated', { cached: result.cached });
            } else {
                setAiError(result.error || 'Failed to generate try-on');
                Alert.alert('Generation Failed', result.error || 'Could not generate virtual try-on. Please try again.');
            }
        } catch (error: any) {
            logger.error('AI try-on failed', { error: error.message });
            setAiError(error.message);
            Alert.alert('Error', 'Failed to generate virtual try-on');
        } finally {
            setGenerating(false);
        }
    };

    const renderItemChip = (item: ClothingItem) => {
        const isSelected = selectedItemId === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.itemChip, isSelected && styles.itemChipSelected]}
                onPress={() => setSelectedItemId(item.id)}
            >
                <Image
                    source={{ uri: item.processed_image_url || item.image_url }}
                    style={styles.itemChipImage}
                />
                <Text style={[styles.itemChipText, isSelected && styles.itemChipTextSelected]} numberOfLines={1}>
                    {item.subcategory || item.category}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="Virtual Try-On"
                subtitle={items.length > 0 ? `${items.length} items in outfit` : 'Loading...'}
                showBack
                onBack={() => navigation.goBack()}
                rightAction={
                    <TouchableOpacity
                        onPress={() => navigation.navigate('ModelSelection')}
                        style={styles.modelButton}
                    >
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary.solid} />
                    </TouchableOpacity>
                }
            />

            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'overlay' && styles.modeButtonActive]}
                    onPress={() => setMode('overlay')}
                >
                    <Ionicons 
                        name="layers-outline" 
                        size={18} 
                        color={mode === 'overlay' ? 'white' : theme.colors.text.secondary} 
                    />
                    <Text style={[styles.modeButtonText, mode === 'overlay' && styles.modeButtonTextActive]}>
                        Overlay
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'ai' && styles.modeButtonActive]}
                    onPress={() => aiTryOnImage ? setMode('ai') : handleGenerateAITryOn()}
                >
                    <Ionicons 
                        name="sparkles-outline" 
                        size={18} 
                        color={mode === 'ai' ? 'white' : theme.colors.text.secondary} 
                    />
                    <Text style={[styles.modeButtonText, mode === 'ai' && styles.modeButtonTextActive]}>
                        AI Try-On
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Canvas with Avatar and Clothing */}
            <View style={styles.canvas} onLayout={handleCanvasLayout}>
                {mode === 'ai' && aiTryOnImage ? (
                    // AI Generated Result
                    <Image
                        source={{ uri: aiTryOnImage }}
                        style={styles.aiResultImage}
                        resizeMode="contain"
                    />
                ) : (
                    // Overlay Mode
                    <>
                        {avatarSource ? (
                            <Image
                                source={avatarSource}
                                style={styles.avatar}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.noAvatarPlaceholder}>
                                <Ionicons name="person-outline" size={80} color={theme.colors.neutral[300]} />
                                <Text style={styles.noAvatarText}>No model selected</Text>
                            </View>
                        )}

                        {loading ? (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={theme.colors.primary.solid} />
                                <Text style={styles.loadingText}>Loading outfit...</Text>
                            </View>
                        ) : (
                            items.map((item) => (
                                <DraggableClothingLayer
                                    key={item.id}
                                    item={item}
                                    canvasWidth={canvasLayout.width}
                                    canvasHeight={canvasLayout.height}
                                    isSelected={selectedItemId === item.id}
                                    onSelect={() => setSelectedItemId(item.id)}
                                />
                            ))
                        )}
                    </>
                )}

                {/* Generating Overlay */}
                {generating && (
                    <View style={styles.generatingOverlay}>
                        <LinearGradient
                            colors={[theme.colors.primary.start, theme.colors.primary.end]}
                            style={styles.generatingIcon}
                        >
                            <ActivityIndicator size="large" color="white" />
                        </LinearGradient>
                        <Text style={styles.generatingText}>Generating AI Try-On...</Text>
                        <Text style={styles.generatingSubtext}>This may take up to 30 seconds</Text>
                    </View>
                )}

                {!selectedAvatar && !generating && (
                    <TouchableOpacity
                        style={styles.selectModelOverlay}
                        onPress={() => navigation.navigate('ModelSelection')}
                    >
                        <View style={styles.selectModelButton}>
                            <Ionicons name="person-add" size={24} color="white" />
                            <Text style={styles.selectModelText}>Select Model</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* AI Generation Button */}
            {mode === 'overlay' && items.length > 0 && !generating && (
                <View style={styles.generateSection}>
                    <Button
                        title="✨ Generate AI Try-On"
                        onPress={handleGenerateAITryOn}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={generating}
                        disabled={generating || !selectedAvatar}
                    />
                    {!selectedAvatar && (
                        <Text style={styles.generateHint}>Select a model photo first</Text>
                    )}
                </View>
            )}

            {/* Item selector chips */}
            {items.length > 0 && mode === 'overlay' && (
                <View style={styles.itemSelector}>
                    <Text style={styles.selectorLabel}>Tap to select, drag to adjust:</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsContainer}
                    >
                        {items.map(renderItemChip)}
                    </ScrollView>
                </View>
            )}

            {/* Instructions */}
            {mode === 'overlay' && (
                <View style={styles.instructions}>
                    <View style={styles.instructionItem}>
                        <Ionicons name="move-outline" size={18} color={theme.colors.text.secondary} />
                        <Text style={styles.instructionText}>Drag items to reposition</Text>
                    </View>
                    <View style={styles.instructionItem}>
                        <Ionicons name="finger-print-outline" size={18} color={theme.colors.text.secondary} />
                        <Text style={styles.instructionText}>Tap chips to select</Text>
                    </View>
                </View>
            )}

            {/* AI Mode - Regenerate option */}
            {mode === 'ai' && aiTryOnImage && (
                <View style={styles.aiActions}>
                    <TouchableOpacity style={styles.regenerateButton} onPress={handleGenerateAITryOn}>
                        <Ionicons name="refresh" size={20} color={theme.colors.primary.solid} />
                        <Text style={styles.regenerateText}>Regenerate</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    modelButton: {
        padding: 4,
    },
    canvas: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.sm,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        ...theme.shadows.lg,
    },
    avatar: {
        width: '100%',
        height: '100%',
        opacity: 0.95,
    },
    noAvatarPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.neutral[100],
    },
    noAvatarText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.text.tertiary,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    clothingLayer: {
        position: 'absolute',
        borderRadius: 8,
    },
    clothingLayerSelected: {
        borderWidth: 2,
        borderColor: theme.colors.primary.solid,
        borderRadius: 12,
    },
    clothingImage: {
        width: '100%',
        height: '100%',
    },
    selectedIndicator: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: theme.colors.primary.solid,
        borderRadius: 12,
        padding: 4,
    },
    selectModelOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    selectModelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary.solid,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        ...theme.shadows.md,
    },
    selectModelText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    itemSelector: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
    },
    selectorLabel: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    chipsContainer: {
        gap: 10,
        paddingRight: theme.spacing.md,
    },
    itemChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 8,
        ...theme.shadows.sm,
    },
    itemChipSelected: {
        backgroundColor: theme.colors.primary.solid,
    },
    itemChipImage: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: theme.colors.neutral[100],
    },
    itemChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text.primary,
        textTransform: 'capitalize',
        maxWidth: 80,
    },
    itemChipTextSelected: {
        color: 'white',
    },
    instructions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    instructionText: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    
    // Mode Toggle
    modeToggle: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.neutral[100],
        borderRadius: 12,
        padding: 4,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
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
    
    // AI Result
    aiResultImage: {
        width: '100%',
        height: '100%',
    },
    
    // Generating Overlay
    generatingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
    },
    generatingIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    generatingText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    generatingSubtext: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    
    // Generate Section
    generateSection: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    generateHint: {
        textAlign: 'center',
        fontSize: 12,
        color: theme.colors.text.tertiary,
        marginTop: 8,
    },
    
    // AI Actions
    aiActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: theme.spacing.lg,
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: theme.colors.primary.solid + '15',
        borderRadius: 25,
    },
    regenerateText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },
});
