import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    Alert,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getWardrobeItem, updateWardrobeItem, deleteWardrobeItem, reanalyzeWardrobeItem } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { theme } from '../styles/theme';
import { logger, logInteraction, logNavigation } from '../utils/logger';

type RouteParams = {
    ItemDetail: {
        itemId: string;
    };
};

interface WardrobeItem {
    id: string;
    category: string;
    subcategory?: string;
    color?: string;
    style?: string;
    pattern?: string;
    material?: string;
    season?: string[];
    occasions?: string[];
    brand?: string;
    ai_description?: string;
    ai_confidence?: number;
    image_url: string;
    processed_image_url?: string;
    created_at: string;
}

export default function ItemDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'ItemDetail'>>();
    const { session } = useAuth();
    const token = session?.access_token;
    
    const [item, setItem] = useState<WardrobeItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Editable fields
    const [editCategory, setEditCategory] = useState('');
    const [editSubcategory, setEditSubcategory] = useState('');
    const [editColor, setEditColor] = useState('');
    const [editBrand, setEditBrand] = useState('');

    const fetchItem = useCallback(async () => {
        if (!token) return;
        logger.debug('Fetching item details', { itemId: route.params.itemId });
        try {
            const data = await getWardrobeItem(route.params.itemId, token);
            logger.info('Item details loaded', { 
                itemId: data.id, 
                category: data.category,
                hasAiAnalysis: !!data.ai_description 
            });
            setItem(data);
            setEditCategory(data.category || '');
            setEditSubcategory(data.subcategory || '');
            setEditColor(data.color || '');
            setEditBrand(data.brand || '');
        } catch (error: any) {
            logger.error('Failed to load item details', { itemId: route.params.itemId, error: error.message });
            Alert.alert('Error', error.message);
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [token, route.params.itemId]);

    useEffect(() => {
        logger.debug('ItemDetailScreen mounted', { itemId: route.params.itemId });
        fetchItem();
    }, [fetchItem]);

    const handleSave = async () => {
        if (!token || !item) return;
        
        logInteraction.buttonPress('Save', 'ItemDetailScreen');
        setSaving(true);
        logger.info('Saving item updates', { itemId: item.id });
        
        try {
            const updates = {
                category: editCategory,
                subcategory: editSubcategory,
                color: editColor,
                brand: editBrand || undefined,
            };
            const updated = await updateWardrobeItem(item.id, updates, token);
            logger.info('Item updated successfully', { itemId: item.id });
            setItem(updated);
            setIsEditing(false);
            Alert.alert('Success', 'Item updated successfully');
        } catch (error: any) {
            logger.error('Failed to update item', { itemId: item.id, error: error.message });
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        logInteraction.buttonPress('Delete', 'ItemDetailScreen');
        Alert.alert(
            'Delete Item',
            'Are you sure you want to delete this item from your wardrobe?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        if (!token || !item) return;
                        setDeleting(true);
                        logger.info('Deleting item', { itemId: item.id });
                        try {
                            await deleteWardrobeItem(item.id, token);
                            logger.info('Item deleted successfully', { itemId: item.id });
                            logNavigation.goBack();
                            navigation.goBack();
                        } catch (error: any) {
                            logger.error('Failed to delete item', { itemId: item.id, error: error.message });
                            Alert.alert('Error', error.message);
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleReanalyze = async () => {
        if (!token || !item) return;
        
        logInteraction.buttonPress('Reanalyze', 'ItemDetailScreen');
        setAnalyzing(true);
        logger.info('Starting AI re-analysis', { itemId: item.id });
        const startTime = Date.now();
        
        try {
            const updated = await reanalyzeWardrobeItem(item.id, token);
            const duration = Date.now() - startTime;
            logger.info('AI re-analysis complete', { 
                itemId: item.id, 
                category: updated.category,
                confidence: updated.ai_confidence,
                duration: `${duration}ms`
            });
            setItem(updated);
            setEditCategory(updated.category || '');
            setEditSubcategory(updated.subcategory || '');
            setEditColor(updated.color || '');
            setEditBrand(updated.brand || '');
            Alert.alert('✨ Analysis Complete', `AI detected: ${updated.color || ''} ${updated.subcategory || updated.category}`);
        } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error('AI re-analysis failed', { itemId: item.id, error: error.message, duration: `${duration}ms` });
            Alert.alert('Analysis Failed', error.message);
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.solid} />
                </View>
            </SafeAreaView>
        );
    }

    if (!item) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Item not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const confidencePercent = item.ai_confidence ? Math.round(item.ai_confidence * 100) : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Item Details</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
                        <Ionicons 
                            name={isEditing ? "close" : "pencil"} 
                            size={22} 
                            color={theme.colors.primary.solid} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: item.processed_image_url || item.image_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    {item.ai_confidence !== undefined && item.ai_confidence > 0 && (
                        <View style={styles.confidenceBadge}>
                            <Ionicons name="sparkles" size={14} color="white" />
                            <Text style={styles.confidenceText}>{confidencePercent}% AI</Text>
                        </View>
                    )}
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    {item.ai_description && (
                        <View style={styles.descriptionSection}>
                            <Ionicons name="sparkles" size={16} color={theme.colors.primary.solid} />
                            <Text style={styles.descriptionText}>{item.ai_description}</Text>
                        </View>
                    )}

                    {isEditing ? (
                        // Edit Mode
                        <View style={styles.editSection}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Category</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editCategory}
                                    onChangeText={setEditCategory}
                                    placeholder="e.g., tops, bottoms, shoes"
                                    placeholderTextColor={theme.colors.text.tertiary}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Subcategory</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editSubcategory}
                                    onChangeText={setEditSubcategory}
                                    placeholder="e.g., t-shirt, jeans, sneakers"
                                    placeholderTextColor={theme.colors.text.tertiary}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Color</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editColor}
                                    onChangeText={setEditColor}
                                    placeholder="e.g., navy blue, black"
                                    placeholderTextColor={theme.colors.text.tertiary}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Brand (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editBrand}
                                    onChangeText={setEditBrand}
                                    placeholder="e.g., Nike, Zara"
                                    placeholderTextColor={theme.colors.text.tertiary}
                                />
                            </View>
                            <Button
                                title="Save Changes"
                                onPress={handleSave}
                                variant="primary"
                                fullWidth
                                loading={saving}
                            />
                        </View>
                    ) : (
                        // View Mode
                        <View style={styles.detailsGrid}>
                            <DetailRow label="Category" value={item.category} icon="folder-outline" />
                            {item.subcategory && (
                                <DetailRow label="Type" value={item.subcategory} icon="shirt-outline" />
                            )}
                            {item.color && (
                                <DetailRow label="Color" value={item.color} icon="color-palette-outline" />
                            )}
                            {item.style && (
                                <DetailRow label="Style" value={item.style} icon="sparkles-outline" />
                            )}
                            {item.pattern && (
                                <DetailRow label="Pattern" value={item.pattern} icon="grid-outline" />
                            )}
                            {item.material && (
                                <DetailRow label="Material" value={item.material} icon="layers-outline" />
                            )}
                            {item.brand && (
                                <DetailRow label="Brand" value={item.brand} icon="pricetag-outline" />
                            )}
                        </View>
                    )}

                    {/* Tags */}
                    {!isEditing && (
                        <>
                            {item.season && item.season.length > 0 && (
                                <View style={styles.tagsSection}>
                                    <Text style={styles.tagsLabel}>Seasons</Text>
                                    <View style={styles.tagsContainer}>
                                        {item.season.map((s, i) => (
                                            <View key={i} style={styles.tag}>
                                                <Text style={styles.tagText}>{s}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {item.occasions && item.occasions.length > 0 && (
                                <View style={styles.tagsSection}>
                                    <Text style={styles.tagsLabel}>Best for</Text>
                                    <View style={styles.tagsContainer}>
                                        {item.occasions.map((o, i) => (
                                            <View key={i} style={[styles.tag, styles.occasionTag]}>
                                                <Text style={[styles.tagText, styles.occasionTagText]}>{o}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {/* Re-analyze Button */}
                    <TouchableOpacity 
                        style={styles.reanalyzeButton} 
                        onPress={handleReanalyze}
                        disabled={analyzing}
                    >
                        {analyzing ? (
                            <ActivityIndicator size="small" color={theme.colors.primary.solid} />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={20} color={theme.colors.primary.solid} />
                                <Text style={styles.reanalyzeButtonText}>Re-analyze with AI</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <ActivityIndicator size="small" color={theme.colors.error} />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                <Text style={styles.deleteButtonText}>Delete Item</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

interface DetailRowProps {
    label: string;
    value: string;
    icon: string;
}

function DetailRow({ label, value, icon }: DetailRowProps) {
    return (
        <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
                <Ionicons name={icon as any} size={18} color={theme.colors.primary.solid} />
            </View>
            <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
            </View>
        </View>
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
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.sm,
    },
    imageContainer: {
        marginHorizontal: theme.spacing.lg,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'white',
        ...theme.shadows.lg,
    },
    image: {
        width: '100%',
        aspectRatio: 1,
    },
    confidenceBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    confidenceText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    infoCard: {
        margin: theme.spacing.lg,
        padding: theme.spacing.lg,
        backgroundColor: 'white',
        borderRadius: 20,
        ...theme.shadows.md,
    },
    descriptionSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: theme.spacing.lg,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.primary.solid + '10',
        borderRadius: 12,
    },
    descriptionText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 20,
    },
    editSection: {
        gap: theme.spacing.md,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text.secondary,
    },
    input: {
        backgroundColor: theme.colors.neutral[100],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text.primary,
    },
    detailsGrid: {
        gap: theme.spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    detailIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.primary.solid + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text.primary,
        textTransform: 'capitalize',
    },
    tagsSection: {
        marginTop: theme.spacing.lg,
    },
    tagsLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: theme.colors.neutral[100],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        textTransform: 'capitalize',
    },
    occasionTag: {
        backgroundColor: theme.colors.primary.solid + '15',
    },
    occasionTagText: {
        color: theme.colors.primary.solid,
    },
    actionButtons: {
        marginHorizontal: theme.spacing.lg,
        marginBottom: 140,
        gap: theme.spacing.sm,
    },
    reanalyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.primary.solid + '10',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.primary.solid + '30',
    },
    reanalyzeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.primary.solid,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: theme.spacing.md,
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.error,
    },
});
