import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface CircularProgressProps {
  progress: number; // 0-100
  message?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  acceleratedCompletion?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  message = 'Processing...',
  size = 100,
  strokeWidth = 8,
  color,
  acceleratedCompletion = false,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const currentProgress = useRef(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Use theme color if no color prop is provided
  const progressColor = color || colors.primary;

  useEffect(() => {
    // Store current progress before animation
    const startProgress = currentProgress.current;
    currentProgress.current = progress;

    // If acceleratedCompletion is true and we're not at 100%, use a faster animation
    const duration = acceleratedCompletion && progress < 100 ? 300 : 500;

    Animated.timing(animatedValue, {
      toValue: progress,
      duration: duration,
      useNativeDriver: false,
    }).start();
  }, [progress, acceleratedCompletion]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.overlay }]}>
      <View style={[styles.progressContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      </View>
      
      {/* Status message */}
      <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 16,
    marginHorizontal: 40,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  svg: {
    position: 'absolute',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CircularProgress; 