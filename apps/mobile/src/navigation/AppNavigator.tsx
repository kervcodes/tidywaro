import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import UploadScreen from '../screens/UploadScreen';
import ClosetScreen from '../screens/ClosetScreen';
import StyleAIScreen from '../screens/StyleAIScreen';
import SignInScreen from '../screens/SignInScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import ModelSelectionScreen from '../screens/ModelSelectionScreen';
import TryOnScreen from '../screens/TryOnScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import UserPhotosScreen from '../screens/UserPhotosScreen';
import TryOnJobScreen from '../screens/TryOnJobScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { theme } from '../styles/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }: { route: any }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }: { focused: boolean, color: string, size: number }) => {
                    let iconName: any;

                    if (route.name === 'Upload') {
                        iconName = focused ? 'add-circle' : 'add-circle-outline';
                    } else if (route.name === 'Closet') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'StyleAI') {
                        iconName = focused ? 'sparkles' : 'sparkles-outline';
                    }

                    return (
                        <View style={focused ? styles.activeIconContainer : undefined}>
                            <Ionicons name={iconName} size={focused ? 26 : 24} color={color} />
                        </View>
                    );
                },
                tabBarActiveTintColor: theme.colors.primary.solid,
                tabBarInactiveTintColor: theme.colors.neutral[400],
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: -2,
                },
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 24,
                    left: 20,
                    right: 20,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.85)' : 'white',
                    borderTopWidth: 0,
                    paddingBottom: 8,
                    paddingTop: 8,
                    ...theme.shadows.xl,
                    shadowColor: theme.colors.primary.solid,
                    shadowOpacity: 0.15,
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                },
                tabBarBackground: () => (
                    Platform.OS === 'ios' ? (
                        <BlurView
                            intensity={80}
                            tint="light"
                            style={{
                                ...StyleSheet.absoluteFillObject,
                                borderRadius: 35,
                                overflow: 'hidden',
                            }}
                        />
                    ) : null
                ),
            })}
        >
            <Tab.Screen name="Upload" component={UploadScreen} options={{ tabBarLabel: 'Add' }} />
            <Tab.Screen name="Closet" component={ClosetScreen} options={{ tabBarLabel: 'Closet' }} />
            <Tab.Screen name="StyleAI" component={StyleAIScreen} options={{ tabBarLabel: 'Style AI' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    activeIconContainer: {
        backgroundColor: theme.colors.primary.solid + '15',
        borderRadius: 12,
        padding: 6,
        marginBottom: -4,
    },
});

export default function AppNavigator() {
    const { session, isLoading, hasCompletedOnboarding } = useAuth();

    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer>
            <SubscriptionProvider>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {!session ? (
                        <Stack.Screen name="SignIn" component={SignInScreen} />
                    ) : (
                        <>
                            <Stack.Screen name="Main" component={MainTabNavigator} />
                            <Stack.Screen
                                name="ItemDetail"
                                component={ItemDetailScreen}
                                options={{
                                    presentation: 'card',
                                }}
                            />
                            <Stack.Screen
                                name="ModelSelection"
                                component={ModelSelectionScreen}
                                options={{
                                    presentation: 'card',
                                }}
                            />
                            <Stack.Screen
                                name="TryOn"
                                component={TryOnScreen}
                                options={{
                                    presentation: 'modal',
                                }}
                            />
                            <Stack.Screen
                                name="Upgrade"
                                component={UpgradeScreen}
                                options={{
                                    presentation: 'modal',
                                }}
                            />
                            <Stack.Screen
                                name="UserPhotos"
                                component={UserPhotosScreen}
                                options={{
                                    presentation: 'card',
                                }}
                            />
                            <Stack.Screen
                                name="TryOnJob"
                                component={TryOnJobScreen}
                                options={{
                                    presentation: 'modal',
                                }}
                            />
                        </>
                    )}
                </Stack.Navigator>
            </SubscriptionProvider>
        </NavigationContainer>
    );
}
