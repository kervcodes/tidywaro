import axios from 'axios';
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android Emulator
// For physical devices (iPhone/Android), use your computer's local LAN IP address (e.g., 192.168.1.x)
// REPLACE 'YOUR_LOCAL_IP' with your actual IP address (run `ipconfig` on Windows or `ifconfig` on Mac)
const LOCAL_IP = '192.168.1.165';

const DEV_API_URL = Platform.select({
    android: 'http://10.0.2.2:3000',
    ios: `http://${LOCAL_IP}:3000`, // Use local IP for physical iPhone
    default: `http://${LOCAL_IP}:3000`,
});

const api = axios.create({
    baseURL: DEV_API_URL,
});

export const uploadWardrobeItem = async (imageUri: string, category: string, token: string) => {
    // Validate imageUri
    if (!imageUri || typeof imageUri !== 'string') {
        throw new Error('Invalid imageUri: must be a non-empty string');
    }
    
    if (imageUri.trim() === '') {
        throw new Error('Invalid imageUri: must be a non-empty string');
    }

    // Validate that imageUri is a valid URI format (file://, content://, or http(s)://)
    const uriPattern = /^(file|content|https?):\/\/.+\S/i;
    if (!uriPattern.test(imageUri)) {
        throw new Error('Invalid imageUri: must be a valid URI format (file://, content://, or http(s)://)');
    }

    // Validate category
    if (!category || typeof category !== 'string') {
        throw new Error('Invalid category: must be a non-empty string');
    }
    
    if (category.trim() === '') {
        throw new Error('Invalid category: must be a non-empty string');
    }

    // Validate that category doesn't contain invalid characters (allow letters, numbers, spaces, hyphens, underscores)
    const categoryPattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!categoryPattern.test(category.trim())) {
        throw new Error('Invalid category: contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed');
    }

    const formData = new FormData();

    // Append image
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
        uri: imageUri,
        name: filename || 'upload.jpg',
        type,
    } as any);

    // Append category
    formData.append('category', category);

    try {
        const response = await api.post('/wardrobe/items', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};

export const getWardrobeItems = async (token: string) => {
    try {
        const response = await api.get('/wardrobe/items', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Fetch items failed:', error);
        throw error;
    }
};

export default api;
