import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

// Try multiple ways to get env vars (Expo can be finicky)
const supabaseUrl = 
    process.env.EXPO_PUBLIC_SUPABASE_URL || 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
    'https://deemkgoakjbloxrcjeff.supabase.co';

const supabaseKey = 
    process.env.EXPO_PUBLIC_SUPABASE_KEY || 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZW1rZ29ha2pibG94cmNqZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzg5MzMsImV4cCI6MjA3OTM1NDkzM30.cJHVyz8JqhZ5B4UWPnzfLGv-TKfjCPgu6pKNQWhZ6ko';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
