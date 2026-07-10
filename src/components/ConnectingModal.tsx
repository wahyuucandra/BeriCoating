import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';

interface ConnectingModalProps {
  visible: boolean;
  deviceAddress: string;
}

export function ConnectingModal({ visible, deviceAddress }: ConnectingModalProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Rotate spinner
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Pulse dots
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          {/* Spinning ring */}
          <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
            <View style={styles.spinnerDot} />
          </Animated.View>

          {/* Center icon */}
          <View style={styles.centerIcon}>
            <Text style={styles.centerIconText}>🔗</Text>
          </View>

          <Text style={styles.title}>Connecting</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {deviceAddress}
          </Text>

          {/* Animated dots */}
          <Animated.View style={[styles.dots, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 48,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    minWidth: 240,
  },
  spinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    borderTopColor: '#1976D2',
    borderRightColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  spinnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  centerIcon: {
    position: 'absolute',
    top: 56,
  },
  centerIconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#757575',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  dots: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.3,
  },
});