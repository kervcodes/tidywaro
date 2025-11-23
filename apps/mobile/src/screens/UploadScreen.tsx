import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, TextInput, Alert, ActivityIndicator, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadWardrobeItem } from '../services/api';
import { useAuth } from '../contexts/AuthContext';


export default function UploadScreen() {
    const { token, isLoading } = useAuth();
    const [image, setImage] = useState<string | null>(null);
    const [category, setCategory] = useState('');
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Fixed deprecation warning
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleUpload = async () => {
        if (!image) {
            Alert.alert('Error', 'Please pick an image first');
            return;
        }

        if (!category) {
            Alert.alert('Error', 'Please enter a category');
            return;
        }

        if (!token) {
            Alert.alert('Authentication Error', 'Please set up authentication to upload items');
            return;
        }

        setUploading(true);
        try {
            await uploadWardrobeItem(image, category, token);
            Alert.alert('Success', 'Item uploaded successfully!');
            setImage(null);
            setCategory('');
        } catch (error) {
            let errorMessage = 'Failed to upload item';
            if (error) {
                if (typeof error === 'string') {
                    errorMessage += `: ${error}`;
                } else if (error instanceof Error && error.message) {
                    errorMessage += `: ${error.message}`;
                } else if (error && typeof error === 'object') {
                    // Try to extract common error fields
                    if ('message' in error && typeof error.message === 'string') {
                        errorMessage += `: ${error.message}`;
                    } else if ('status' in error && typeof error.status === 'number') {
                        errorMessage += ` (Status: ${error.status})`;
                    }
                }
            }
            Alert.alert('Error', errorMessage);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Pick an image from camera roll" onPress={pickImage} />
            {image && <Image source={{ uri: image }} style={styles.image} accessibilityLabel="Selected wardrobe item preview" />}

            <TextInput
                style={styles.input}
                placeholder="Category (e.g., Shirts)"
                value={category}
                onChangeText={setCategory}
            />

            {uploading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : !token ? (
                <Text style={styles.errorText}>Authentication required. Please set up authentication.</Text>
            ) : (
                <>
                    <Button title="Pick an image from camera roll" onPress={pickImage} />
                    {image && <Image source={{ uri: image }} style={styles.image} />}

                    <TextInput
                        style={styles.input}
                        placeholder="Category (e.g., Shirts)"
                        value={category}
                        onChangeText={setCategory}
                    />

                    {uploading ? (
                        <ActivityIndicator size="large" color="#0000ff" />
                    ) : (
                        <Button title="Upload Item" onPress={handleUpload} disabled={!image} />
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    image: {
        width: 200,
        height: 200,
        marginVertical: 20,
        borderRadius: 10,
    },
    input: {
        width: '100%',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});
