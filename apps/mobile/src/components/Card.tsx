import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    variant?: 'solid' | 'glass';
    elevation?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Card({
    children,
    onPress,
    style,
    variant = 'solid',
    elevation = 'md',
}: CardProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (onPress) {
            Animated.spring(scale, {
                toValue: 0.98,
                useNativeDriver: true,
                friction: 5,
                tension: 100,
            }).start();
        }
    };

    const handlePressOut = () => {
        if (onPress) {
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
                tension: 100,
            }).start();
        }
    };

    const animatedStyle = {
        transform: [{ scale }],
    };

    const containerStyle: ViewStyle = {
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows[elevation],
        ...style,
    };

    if (variant === 'glass') {
        return (
            <AnimatedTouchable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                disabled={!onPress}
                style={[animatedStyle, containerStyle]}
                activeOpacity={onPress ? 0.9 : 1}
            >
                <BlurView intensity={60} tint="light" style={styles.blur}>
                    <View style={styles.content}>{children}</View>
                </BlurView>
            </AnimatedTouchable>
        );
    }

    // Solid variant
    const Component = onPress ? AnimatedTouchable : Animated.View;

    return (
        <Component
            onPressIn={onPress ? handlePressIn : undefined}
            onPressOut={onPress ? handlePressOut : undefined}
            onPress={onPress}
            style={[
                animatedStyle,
                containerStyle,
                { backgroundColor: theme.colors.background.primary },
            ]}
            activeOpacity={onPress ? 0.9 : 1}
        >
            {children}
        </Component>
    );
}

const styles = StyleSheet.create({
    gradientBorder: {
        padding: 1,
        borderRadius: theme.borderRadius.lg,
    },
    blurContainer: {
        borderRadius: theme.borderRadius.lg - 1,
        overflow: 'hidden',
    },
    content: {
        padding: theme.spacing.lg,
    },
});
