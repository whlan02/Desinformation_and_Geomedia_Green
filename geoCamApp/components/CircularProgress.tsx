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
  const { colors, isDark } = useTheme();
  const rotationValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const glowValue = useRef(new Animated.Value(0)).current;
  const currentProgress = useRef(0);
  const startTime = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());
  
  // Use theme-aware color if no color prop is provided - inverted for contrast
  const globeColor = color || (isDark ? '#03DAC6' : '#2C3E50');

  // Start continuous rotation animation
  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 4000, // Slightly slower, more elegant rotation
          useNativeDriver: true,
        }),
        { iterations: -1 } // Infinite loop
      ).start();
    };

    // Start subtle pulsing animation
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ]),
        { iterations: -1 }
      ).start();
    };

    // Start glow animation
    const startGlow = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowValue, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          })
        ]),
        { iterations: -1 }
      ).start();
    };

    // Start all animations
    startRotation();
    startPulse();
    startGlow();

    return () => {
      rotationValue.stopAnimation();
      pulseValue.stopAnimation();
      glowValue.stopAnimation();
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
    if (progress > 0 && progress % 25 === 0) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.15,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 200,
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

  // Create glow effect
  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const progressPercentage = progressValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? colors.overlay : 'rgba(255, 255, 255, 0.7)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }
    ]}>
      <View style={[styles.globeContainer, { width: size + 40, height: size + 40 }]}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.outerGlow,
            {
              width: size + 60,
              height: size + 60,
              borderRadius: (size + 60) / 2,
              opacity: glowOpacity,
              backgroundColor: `${globeColor}${isDark ? '20' : '15'}`,
            }
          ]}
        />

        {/* Progress Ring around Globe */}
        <Animated.View
          style={[
            styles.progressRing,
            {
              width: size + 30,
              height: size + 30,
              borderRadius: (size + 30) / 2,
              borderColor: globeColor,
              borderWidth: 3,
              opacity: progressValue.interpolate({
                inputRange: [0, 100],
                outputRange: [0.4, 1],
              }),
              transform: [
                {
                  rotate: progressValue.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0deg', '360deg'],
                  })
                }
              ]
            }
          ]}
        />

        {/* Inner progress dots */}
        <Animated.View
          style={[
            styles.progressDots,
            {
              width: size + 15,
              height: size + 15,
              borderRadius: (size + 15) / 2,
              opacity: progressPercentage,
            }
          ]}
        >
          {[...Array(8)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: globeColor,
                  transform: [
                    { rotate: `${index * 45}deg` },
                    { translateY: -(size + 15) / 2 + 5 },
                  ],
                  opacity: progressValue.interpolate({
                    inputRange: [index * 12.5, (index + 1) * 12.5],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                }
              ]}
            />
          ))}
        </Animated.View>

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
                { scale: scaleValue },
                { scale: pulseValue }
              ]
            }
          ]}
        >
          <View style={[
            styles.globeInner, 
            { 
              backgroundColor: isDark ? `${globeColor}15` : `${globeColor}08`,
              borderColor: isDark ? `${globeColor}30` : `${globeColor}20`,
              borderWidth: 1
            }
          ]}>
            <Ionicons 
              name="earth" 
              size={size * 0.7} 
              color={globeColor}
              style={styles.globeIcon}
            />
            
            {/* Progress overlay on globe */}
            <Animated.View
              style={[
                styles.progressOverlay,
                {
                  opacity: progressPercentage,
                  backgroundColor: isDark ? `${globeColor}30` : `${globeColor}20`,
                }
              ]}
            />
          </View>
        </Animated.View>
        
        {/* Percentage and time display */}
        {(showPercentage || showTimeRemaining) && (
          <View style={styles.infoContainer}>
            {showPercentage && (
              <Animated.View style={[
                styles.percentageContainer,
                {
                  backgroundColor: isDark ? colors.overlay : 'rgba(0, 0, 0, 0.8)',
                  transform: [{ scale: scaleValue }]
                }
              ]}>
                <Text style={[styles.percentageText, { color: isDark ? colors.text : '#ffffff' }]}>
                  {Math.round(progress)}%
                </Text>
              </Animated.View>
            )}
            {showTimeRemaining && estimatedDuration && (
              <Text style={[
                styles.timeText, 
                { 
                  color: isDark ? (colors.textSecondary || colors.text) : '#ffffff',
                  backgroundColor: isDark ? colors.overlay : 'rgba(0, 0, 0, 0.8)'
                }
              ]}>
                {getTimeRemaining()}
              </Text>
            )}
          </View>
        )}
      </View>
      
      {/* Status message with enhanced styling */}
      <Animated.View style={[
        styles.messageContainer,
        {
          backgroundColor: isDark ? colors.overlay : 'rgba(0, 0, 0, 0.05)',
          borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.1)',
          transform: [{ scale: pulseValue }]
        }
      ]}>
        <Text style={[styles.messageText, { color: colors.text }]}>{getDynamicMessage()}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 20,
    marginHorizontal: 30,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  backgroundBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  globeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  outerGlow: {
    position: 'absolute',
    borderRadius: 50,
  },
  globe: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 10,
  },
  globeInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  globeIcon: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  progressRing: {
    position: 'absolute',
    borderStyle: 'dashed',
    borderColor: 'transparent',
    zIndex: 5,
  },
  progressDots: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  progressDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  infoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    top: '60%',
    zIndex: 15,
  },
  percentageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  messageContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default CircularProgress;