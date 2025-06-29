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
  estimatedDuration?: number; // Total estimated duration in milliseconds
  smoothAnimation?: boolean; // Whether to use smooth interpolated animation
  showPercentage?: boolean; // Whether to show percentage in center
  showTimeRemaining?: boolean; // Whether to show estimated time remaining
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  message = 'Processing...',
  size = 100,
  strokeWidth = 8,
  color,
  acceleratedCompletion = false,
  estimatedDuration,
  smoothAnimation = true,
  showPercentage = true,
  showTimeRemaining = false,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const currentProgress = useRef(0);
  const startTime = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Use theme color if no color prop is provided
  const progressColor = color || colors.primary;

  useEffect(() => {
    const now = Date.now();
    const startProgress = currentProgress.current;
    const progressDelta = progress - startProgress;
    
    // Initialize start time on first progress update
    if (startTime.current === null && progress > 0) {
      startTime.current = now;
    }
    
    // Calculate dynamic duration based on progress rate and estimation
    let duration: number;
    
    if (estimatedDuration && startTime.current) {
      // Use estimated duration proportionally
      const elapsedTime = now - startTime.current;
      const remainingProgress = 100 - progress;
      const estimatedRemainingTime = (remainingProgress / 100) * estimatedDuration;
      
      if (smoothAnimation) {
        // Smooth animation that adapts to the estimated completion time
        duration = Math.min(Math.max(estimatedRemainingTime * 0.1, 100), 1000);
      } else {
        // Direct mapping to estimated time
        duration = Math.max(estimatedRemainingTime * 0.05, 50);
      }
    } else {
      // Fallback to adaptive duration based on progress delta and update frequency
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      const progressRate = Math.abs(progressDelta) / Math.max(timeSinceLastUpdate, 1);
      
      if (acceleratedCompletion && progress >= 90) {
        // Fast completion for final 10%
        duration = 150;
      } else if (progressRate > 20) {
        // Fast progress updates - shorter animation
        duration = 200;
      } else if (progressRate > 5) {
        // Medium progress updates
        duration = 400;
      } else {
        // Slow progress updates - longer animation
        duration = 600;
      }
    }
    
    // Update tracking variables
    currentProgress.current = progress;
    lastUpdateTime.current = now;

    Animated.timing(animatedValue, {
      toValue: progress,
      duration: duration,
      useNativeDriver: false,
    }).start();
  }, [progress, acceleratedCompletion, estimatedDuration, smoothAnimation]);

  // Calculate estimated time remaining
  const getTimeRemaining = (): string => {
    if (!estimatedDuration || !startTime.current || progress <= 0) {
      return '';
    }

    const elapsedTime = Date.now() - startTime.current;
    const remainingProgress = Math.max(100 - progress, 0);
    
    // Calculate remaining time based on the original estimated duration
    const estimatedRemainingTime = (remainingProgress / 100) * estimatedDuration;
    
    const seconds = Math.max(Math.ceil(estimatedRemainingTime / 1000), 0);
    
    if (progress >= 95) {
      return 'Almost done...';
    } else if (seconds <= 1) {
      return 'Few seconds...';
    } else if (seconds < 60) {
      return `~${seconds} sec`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `~${minutes} min`;
      } else if (remainingSeconds <= 30) {
        return `~${minutes} min`;
      } else {
        return `~${minutes + 1} min`;
      }
    }
  };

  // Get dynamic message based on progress
  const getDynamicMessage = (): string => {
    if (progress >= 90) {
      return 'Finalizing...';
    } else if (progress >= 70) {
      return 'Almost ready...';
    } else if (progress >= 30) {
      return 'Processing...';
    } else {
      return message;
    }
  };

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
        
        {/* Percentage and time display in center */}
        {(showPercentage || showTimeRemaining) && (
          <View style={styles.centerContainer}>
            {showPercentage && (
              <Text style={[styles.percentageText, { color: colors.text }]}>
                {Math.round(progress)}%
              </Text>
            )}
            {showTimeRemaining && estimatedDuration && (
              <Text style={[styles.timeText, { color: colors.textSecondary || colors.text }]}>
                {getTimeRemaining()}
              </Text>
            )}
          </View>
        )}
      </View>
      
      {/* Status message */}
      <Text style={[styles.messageText, { color: colors.text }]}>{getDynamicMessage()}</Text>
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
  centerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CircularProgress;