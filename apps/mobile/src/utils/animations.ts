// import { withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Easing } from 'react-native';

/**
 * Animation configurations for consistent motion across the app
 */

export const springConfig = {
    damping: 15,
    stiffness: 150,
    mass: 1,
};

export const timingConfig = {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

// Dummy implementations to prevent crash while debugging Reanimated
const dummyAnim = (val: any) => ({ start: () => { } });

export const animations = {
    spring: (value: number) => 0, // dummy
    timing: (value: number, duration = 300) => 0, // dummy
    fadeIn: () => ({}),
    fadeOut: () => ({}),
    scaleIn: () => ({}),
    scaleOut: () => ({}),
    slideInFromRight: (distance = 100) => ({}),
    slideInFromLeft: (distance = 100) => ({}),
};

export const staggerDelay = 50;
