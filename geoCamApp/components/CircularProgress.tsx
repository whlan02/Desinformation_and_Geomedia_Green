import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface RotatingGlobeProps {
  progress: number; // 0-100
  message?: string;
  size?: number;
  color?: string;
  acceleratedCompletion?: boolean;
  estimatedDuration?: number; // Total estimated duration in milliseconds
  smoothAnimation?: boolean; // Whether to use smooth interpolated animation
  showPercentage?: boolean; // Whether to show percentage
  showTimeRemaining?: boolean; // Whether to show estimated time remaining
}

export const CircularProgress: React.FC<RotatingGlobeProps> = ({
  progress,
  message = 'Processing...',
  size = 100,
  color,
  acceleratedCompletion = false,
  estimatedDuration,
  smoothAnimation = true,
  showPercentage = true,
  showTimeRemaining = false,
}) => {
  const { colors } = useTheme();
  const rotationValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const currentProgress = useRef(0);
  const startTime = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());
  
  // Use theme color if no color prop is provided
  const globeColor = color || colors.primary;

  // Start continuous rotation animation
  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 3000, // 3 seconds per rotation
          useNativeDriver: true,
        }),
        { iterations: -1 } // Infinite loop
      ).start();
    };

    // Start rotation immediately
    startRotation();

    return () => {
      rotationValue.stopAnimation();
    };
  }, []);

  // Handle progress updates with scale animation
  useEffect(() => {
    const now = Date.now();
    const startProgress = currentProgress.current;
    const progressDelta = progress - startProgress;
    
    // Initialize start time on first progress update
    if (startTime.current === null && progress > 0) {
      startTime.current = now;
    }
    
    // Calculate dynamic duration for progress updates
    let duration: number;
    
    if (estimatedDuration && startTime.current) {
      const elapsedTime = now - startTime.current;
      const remainingProgress = 100 - progress;
      const estimatedRemainingTime = (remainingProgress / 100) * estimatedDuration;
      
      if (smoothAnimation) {
        duration = Math.min(Math.max(estimatedRemainingTime * 0.1, 100), 1000);
      } else {
        duration = Math.max(estimatedRemainingTime * 0.05, 50);
      }
    } else {
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      const progressRate = Math.abs(progressDelta) / Math.max(timeSinceLastUpdate, 1);
      
      if (acceleratedCompletion && progress >= 90) {
        duration = 150;
      } else if (progressRate > 20) {
        duration = 200;
      } else if (progressRate > 5) {
        duration = 400;
      } else {
        duration = 600;
      }
    }
    
    // Update tracking variables
    currentProgress.current = progress;
    lastUpdateTime.current = now;

    // Animate progress value
    Animated.timing(progressValue, {
      toValue: progress,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // Add subtle scale animation for progress milestones
    if (progress > 0 && progress % 20 === 0) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
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

  // Create rotation interpolation
  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.overlay }]}>
      <View style={[styles.globeContainer, { width: size, height: size }]}>
        {/* Rotating Globe */}
        <Animated.View
          style={[
            styles.globe,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [
                { rotate: rotation },
                { scale: scaleValue }
              ]
            }
          ]}
        >
          <Ionicons 
            name="earth" 
            size={size * 0.8} 
            color={globeColor}
            style={styles.globeIcon}
          />
        </Animated.View>

        {/* Progress Ring around Globe */}
        <Animated.View
          style={[
            styles.progressRing,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              borderColor: globeColor,
              borderWidth: 3,
              opacity: progressValue.interpolate({
                inputRange: [0, 100],
                outputRange: [0.3, 1],
              }),
            }
          ]}
        />
        
        {/* Percentage and time display */}
        {(showPercentage || showTimeRemaining) && (
          <View style={styles.infoContainer}>
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
  globeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  globe: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  globeIcon: {
    textAlign: 'center',
  },
  progressRing: {
    position: 'absolute',
    borderStyle: 'dashed',
    borderColor: 'transparent',
  },
  infoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    top: '50%',
    marginTop: 60,
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