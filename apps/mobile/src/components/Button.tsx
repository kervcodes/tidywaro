import React, { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
}: ButtonProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.spring(scale, {
                toValue: 0.95,
                useNativeDriver: true,
                friction: 5,
                tension: 100,
            }).start();
        }
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
            tension: 100,
        }).start();
    };

    const handlePress = () => {
        if (!disabled && !loading) {
            onPress();
        }
    };

    const animatedStyle = {
        transform: [{ scale }],
    };

    const sizeStyles = {
        sm: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
        md: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
        lg: { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xl },
    };

    const textSizeStyles = {
        sm: { fontSize: theme.typography.fontSize.sm },
        md: { fontSize: theme.typography.fontSize.base },
        lg: { fontSize: theme.typography.fontSize.lg },
    };

    const containerStyle: ViewStyle = {
        ...sizeStyles[size],
        borderRadius: theme.borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: theme.spacing.sm,
        opacity: disabled ? 0.5 : 1,
        ...(fullWidth && { width: '100%' }),
    };

    const textStyle: TextStyle = {
        ...textSizeStyles[size],
        fontWeight: theme.typography.fontWeight.semibold,
    };

    // Render gradient button for primary/secondary
    if (variant === 'primary' || variant === 'secondary') {
        const gradientColors: [string, string] = variant === 'primary'
            ? [theme.colors.primary.start, theme.colors.primary.end]
            : [theme.colors.secondary.start, theme.colors.secondary.end];

        return (
            <AnimatedTouchable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                disabled={disabled || loading}
                style={[animatedStyle]}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[containerStyle, theme.shadows.md]}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.text.inverse} />
                    ) : (
                        <>
                            {icon}
                            <Text style={[textStyle, { color: theme.colors.text.inverse }]}>{title}</Text>
                        </>
                    )}
                </LinearGradient>
            </AnimatedTouchable>
        );
    }

    // Render outline/ghost variants
    const outlineStyle: ViewStyle = variant === 'outline'
        ? { borderWidth: 2, borderColor: theme.colors.primary.solid }
        : {};

    const textColor = variant === 'outline' || variant === 'ghost'
        ? theme.colors.primary.solid
        : theme.colors.text.primary;

    return (
        <AnimatedTouchable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled || loading}
            style={[animatedStyle, containerStyle, outlineStyle]}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <>
                    {icon}
                    <Text style={[textStyle, { color: textColor }]}>{title}</Text>
                </>
            )}
        </AnimatedTouchable>
    );
}
