import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSnackbarStore, type SnackbarVariant } from '../store/useSnackbarStore';

const DISPLAY_DURATION = 5000;

const ICON: Record<SnackbarVariant, string> = {
  error: '✕',
  warning: '!',
  success: '✓',
  info: 'i',
};

const BG: Record<SnackbarVariant, string> = {
  error: '#D32F2F',
  warning: '#F57C00',
  success: '#388E3C',
  info: '#1976D2',
};

const GLOW: Record<SnackbarVariant, string> = {
  error: 'rgba(211,47,47,0.25)',
  warning: 'rgba(245,124,0,0.25)',
  success: 'rgba(56,142,60,0.25)',
  info: 'rgba(25,118,210,0.25)',
};

export default function Snackbar() {
  const { visible, message, variant, hide } = useSnackbarStore();
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0.8)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;
  const progressWidth = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.6);
      fadeAnim.setValue(0);
      rotateAnim.setValue(0.8);
      progressWidth.setValue(1);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 140,
          friction: 6,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(rotateAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Pulsing glow ring
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glowScale, {
              toValue: 1.8,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(glowScale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();

      // Animate progress bar
      Animated.timing(progressWidth, {
        toValue: 0,
        duration: DISPLAY_DURATION,
        useNativeDriver: false,
      }).start();

      timerRef.current = setTimeout(() => {
        dismiss();
      }, DISPLAY_DURATION);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => hide());
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0.8, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const iconScale = scaleAnim.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0.4, 1],
  });

  const progressInterpolate = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { scale: scaleAnim },
                { rotate },
              ],
            },
          ]}
        >
          {/* Accent strip */}
          <Animated.View
            style={[styles.accent, { backgroundColor: BG[variant] }]}
          />

          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: GLOW[variant],
                transform: [{ scale: glowScale }],
                opacity: glowOpacity,
              },
            ]}
          />

          {/* Icon circle */}
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: BG[variant], transform: [{ scale: iconScale }] },
            ]}
          >
            <Text style={styles.iconText}>{ICON[variant]}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>
            {variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : variant === 'success' ? 'Success' : 'Info'}
          </Text>

          {/* Message */}
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>

          {/* Dismiss button */}
          <TouchableOpacity onPress={dismiss} style={styles.dismissBtn} activeOpacity={0.7}>
            <Text style={styles.dismissText}>DISMISS</Text>
          </TouchableOpacity>

          {/* Progress bar */}
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: BG[variant],
                width: progressInterpolate,
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 28,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    overflow: 'hidden',
    minWidth: 280,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  glowRing: {
    position: 'absolute',
    top: 42,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    color: '#616161',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  dismissBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#757575',
    letterSpacing: 1.2,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});