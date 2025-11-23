import axios from 'axios';
import { Platform } from 'react-native';

// Type definition for React Native FormData blob
interface FormDataImage {
    uri: string;
    name: string;
    type: string;
}

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
    const formData = new FormData();

    // Append image
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const imageBlob: FormDataImage = {
        uri: imageUri,
        name: filename || 'upload.jpg',
        type,
    };
    formData.append('image', imageBlob as unknown as Blob);

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
