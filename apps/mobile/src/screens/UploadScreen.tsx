import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, TextInput, Text, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadWardrobeItem } from '../services/api';

// TODO: Replace with real auth token from context/storage
const TEMP_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Im84ZjhqWjUxWjRDbDNGZ3giLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2RlZW1rZ29ha2pibG94cmNqZWZmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0NjMyMmE3Mi0yYTE1LTQ0ODUtYTU2Yy0zZTU2NDUxMmYyY2QiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYzODk4OTMzLCJpYXQiOjE3NjM4OTUzMzMsImVtYWlsIjoidGVzdHVzZXIxNzYzODk1MzMzNDYzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJ0ZXN0dXNlcjE3NjM4OTUzMzM0NjNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNDYzMjJhNzItMmExNS00NDg1LWE1NmMtM2U1NjQ1MTJmMmNkIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjM4OTUzMzN9XSwic2Vzc2lvbl9pZCI6ImFkYWQ4ZjM4LTk5Y2UtNGNhMC1hZmI4LTYzOWZkNTM4MjJlNyIsImlzX2Fub255bW91cyI6ZmFsc2V9.i4Rr4dF61AXpo77yyiKvs4ouHm0-zaT10nXuCt9ASaQ';

export default function UploadScreen() {
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

        setUploading(true);
        try {
            await uploadWardrobeItem(image, category, TEMP_TOKEN);
            Alert.alert('Success', 'Item uploaded successfully!');
            setImage(null);
            setCategory('');
        } catch (error) {
            Alert.alert('Error', 'Failed to upload item');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
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
});
