import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Button from '../components/Button';
import { theme } from '../styles/theme';
import { logger } from '../utils/logger';

// Default assets - in a real app, these might come from an API or be dynamically required
const DEFAULT_MODELS = {
    female: [
        { id: 'avatar_female_1', source: require('../../assets/models/avatar_female_1.png'), label: 'Default' },
    ],
    male: [
        { id: 'avatar_male_1', source: require('../../assets/models/avatar_male_1.png'), label: 'Default' },
    ]
};

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GRID_SPACING = theme.spacing.md;
const ITEM_WIDTH = (width - theme.spacing.lg * 2 - GRID_SPACING * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

export default function ModelSelectionScreen() {
    const navigation = useNavigation<any>();
    const { selectedAvatar, setSelectedAvatar } = useAuth();
    const [gender, setGender] = useState<'female' | 'male'>('female');
    const [customImage, setCustomImage] = useState<string | null>(null);

    // If the saved avatar is a custom URI (starts with file:// or content://), show it
    const isCustomAvatar = selectedAvatar && (selectedAvatar.startsWith('file://') || selectedAvatar.startsWith('content://'));

    const handleSelectAvatar = async (avatarId: string) => {
        await setSelectedAvatar(avatarId);
        Alert.alert('Model Updated', 'Your virtual model has been updated!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    const handleUploadPhoto = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photos to upload a custom model.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true, // Maybe disable editing for full body?
            quality: 1,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setCustomImage(uri);
            handleSelectAvatar(uri);
        }
    };

    const renderModelItem = (item: { id: string, source: any, label: string }) => {
        const isSelected = selectedAvatar === item.id;

        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.modelCard, isSelected && styles.modelCardSelected]}
                onPress={() => handleSelectAvatar(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.imageContainer}>
                    <Image source={item.source} style={styles.modelImage} resizeMode="contain" />
                </View>
                <View style={styles.modelLabel}>
                    <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
                        {item.label}
                    </Text>
                    {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary.solid} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="Select Model"
                subtitle="Choose a model for virtual try-on"
                showBack
                onBack={() => navigation.goBack()}
            />

            {/* Gender Toggle */}
            <View style={styles.toggleContainer}>
                <View style={styles.toggleTrack}>
                    <TouchableOpacity
                        style={[styles.toggleOption, gender === 'female' && styles.toggleOptionActive]}
                        onPress={() => setGender('female')}
                    >
                        <Text style={[styles.toggleText, gender === 'female' && styles.toggleTextActive]}>Women</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleOption, gender === 'male' && styles.toggleOptionActive]}
                        onPress={() => setGender('male')}
                    >
                        <Text style={[styles.toggleText, gender === 'male' && styles.toggleTextActive]}>Men</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Upload Section */}
                <TouchableOpacity style={styles.uploadCard} onPress={handleUploadPhoto}>
                    <View style={styles.uploadIcon}>
                        <Ionicons name="camera-outline" size={32} color={theme.colors.primary.solid} />
                    </View>
                    <View>
                        <Text style={styles.uploadTitle}>Upload Your Photo</Text>
                        <Text style={styles.uploadSubtitle}>Use your own full-body photo</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.neutral[400]} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {isCustomAvatar && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Custom Model</Text>
                        <TouchableOpacity
                            style={[styles.modelCard, styles.modelCardSelected]}
                            onPress={() => { }} // It's already selected
                        >
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: selectedAvatar }} style={styles.modelImage} resizeMode="contain" />
                            </View>
                            <View style={styles.modelLabel}>
                                <Text style={[styles.modelName, styles.modelNameSelected]}>Your Upload</Text>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary.solid} />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preset Models</Text>
                    <View style={styles.grid}>
                        {DEFAULT_MODELS[gender].map(renderModelItem)}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    toggleContainer: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    toggleTrack: {
        flexDirection: 'row',
        backgroundColor: theme.colors.neutral[200],
        borderRadius: 12,
        padding: 4,
    },
    toggleOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleOptionActive: {
        backgroundColor: 'white',
        ...theme.shadows.sm,
    },
    toggleText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    toggleTextActive: {
        color: theme.colors.text.primary,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    uploadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: theme.spacing.lg,
        borderRadius: 20,
        marginBottom: theme.spacing.xl,
        gap: theme.spacing.md,
        ...theme.shadows.sm,
    },
    uploadIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.primary.solid + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    uploadSubtitle: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: theme.spacing.md,
        color: theme.colors.text.primary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_SPACING,
    },
    modelCard: {
        width: ITEM_WIDTH,
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        ...theme.shadows.sm,
    },
    modelCardSelected: {
        borderColor: theme.colors.primary.solid,
        backgroundColor: theme.colors.primary.solid + '05',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.75,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modelImage: {
        width: '100%',
        height: '100%',
    },
    modelLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    modelName: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text.primary,
    },
    modelNameSelected: {
        color: theme.colors.primary.solid,
        fontWeight: '700',
    },
});
