import React from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { logger } from './src/utils/logger';

export default function App() {
  logger.info('App starting');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <View style={styles.container}>
            <AppNavigator />
            <StatusBar style="auto" />
          </View>
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
