import axios from 'axios';
import { Platform } from 'react-native';

// Type definition for React Native file upload
// React Native's FormData.append() accepts objects with uri, name, and type
// properties for file uploads, which differs from the standard web Blob API
interface ReactNativeFile {
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

/**
 * Helper function to parse axios errors and provide descriptive error messages
 */
const getErrorMessage = (error: unknown, context: string): string => {
    if (axios.isAxiosError(error)) {
        // Network error (no response received)
        if (!error.response) {
            if (error.code === 'ECONNABORTED') {
                return `${context}: Request timeout. Please check your internet connection and try again.`;
            }
            if (error.message.includes('Network Error')) {
                return `${context}: Network error. Please check your internet connection and ensure the server is running.`;
            }
            return `${context}: Unable to connect to server. Please check your internet connection.`;
        }
        
        // HTTP error responses
        const status = error.response.status;
        const data = error.response.data as { message?: string; error?: string } | undefined;
        const serverMessage = data?.message || data?.error;
        
        switch (status) {
            case 400:
                return `${context}: Invalid request${serverMessage ? ` - ${serverMessage}` : ''}`;
            case 401:
                return `${context}: Authentication failed. Please check your credentials and try again.`;
            case 403:
                return `${context}: Access denied. You don't have permission to perform this action.`;
            case 404:
                return `${context}: Resource not found. The endpoint may not exist.`;
            case 413:
                return `${context}: File too large. Please choose a smaller image.`;
            case 429:
                return `${context}: Too many requests. Please wait a moment and try again.`;
            case 500:
                return `${context}: Server error${serverMessage ? ` - ${serverMessage}` : '. Please try again later.'}`;
            case 503:
                return `${context}: Service unavailable. The server may be down for maintenance.`;
            default:
                return `${context}: Request failed with status ${status}${serverMessage ? ` - ${serverMessage}` : ''}`;
        }
    }
    
    // Unknown error type
    return `${context}: An unexpected error occurred. Please try again.`;
};

export const uploadWardrobeItem = async (imageUri: string, category: string, token: string) => {
    // Validate imageUri
    if (!imageUri || typeof imageUri !== 'string' || imageUri.trim() === '') {
        throw new Error('Invalid imageUri: must be a non-empty string');
    }

    // Validate that imageUri is a valid URI format (file://, content://, or http(s)://)
    const uriPattern = /^(file|content|https?):\/\/\S+$/i;
    if (!uriPattern.test(imageUri.trim())) {
        throw new Error('Invalid imageUri: must be a valid URI format (file://, content://, or http(s)://)');
    }

    // Validate category
    if (!category || typeof category !== 'string' || category.trim() === '') {
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

    const imageFile: ReactNativeFile = {
        uri: imageUri,
        name: filename || 'upload.jpg',
        type,
    };
    
    // React Native's FormData implementation accepts ReactNativeFile objects
    // We cast to unknown first, then to Blob to satisfy TypeScript's type checking
    // while maintaining our type safety through the ReactNativeFile interface
    formData.append('image', imageFile as unknown as Blob);

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
        const errorMessage = getErrorMessage(error, 'Upload failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
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
        const errorMessage = getErrorMessage(error, 'Fetch items failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

export default api;
