import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useBluetooth } from '../hooks/useBluetooth';
import type { MeasurementWithTimestamp } from '../utils/parser';

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function MeasurementScreen() {
  const router = useRouter();
  const { connectedDevice, isConnected, latestMeasurement, history, clearHistory } = useBluetoothStore();
  const { disconnectDevice, isReconnecting, reconnectAttempts } = useBluetooth();

  // Animated values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const valueScale = useRef(new Animated.Value(1)).current;
  const cardGlow = useRef(new Animated.Value(0)).current;
  const prevValueRef = useRef<number | null>(null);

  // Pulsing green dot for connected status
  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected]);

  // Animate measurement value on new data
  useEffect(() => {
    if (!latestMeasurement) return;

    // Scale bounce animation on new value
    if (prevValueRef.current !== null && prevValueRef.current !== latestMeasurement.value) {
      // Reset
      valueScale.setValue(1);
      cardGlow.setValue(0);

      Animated.parallel([
        Animated.sequence([
          Animated.spring(valueScale, {
            toValue: 1.12,
            speed: 20,
            bounciness: 12,
            useNativeDriver: true,
          }),
          Animated.spring(valueScale, {
            toValue: 1,
            speed: 8,
            bounciness: 6,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(cardGlow, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(cardGlow, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    prevValueRef.current = latestMeasurement.value;
  }, [latestMeasurement?.timestamp]);

  const glowOpacity = cardGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  const handleDisconnect = useCallback(() => {
    disconnectDevice();
    router.replace('/');
  }, [disconnectDevice, router]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  const formatValue = (value: number, substrate: string | null): string => {
    return substrate === 'NFe' ? value.toString() : value.toFixed(1);
  };

  const renderHistoryItem = ({ item, index }: { item: MeasurementWithTimestamp; index: number }) => (
    <View
      style={[
        styles.historyItem,
        index === 0 && styles.historyItemLatest,
      ]}
    >
      <View style={styles.historyLeft}>
        <View style={styles.historyIndex}>
          <Text style={styles.historyIndexText}>{history.length - index}</Text>
        </View>
        <View style={styles.historyValueWrap}>
          <Text style={styles.historyValueText}>
            {formatValue(item.value, item.substrate)}
          </Text>
          <Text style={styles.historyUnit}>
            {item.unit === 'um' ? 'µm' : item.unit === 'mil' ? 'mil' : '---'}
          </Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <View style={[
          styles.substrateBadge,
          item.substrate === 'Fe' && styles.substrateFe,
          item.substrate === 'NFe' && styles.substrateNFe,
        ]}>
          <Text style={[
            styles.substrateBadgeText,
            item.substrate === 'Fe' && styles.substrateFeText,
            item.substrate === 'NFe' && styles.substrateNFeText,
          ]}>
            {item.substrate ?? '---'}
          </Text>
        </View>
        <Text style={styles.historyTimestamp}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📡</Text>
      <Text style={styles.emptyText}>Waiting for measurements...</Text>
      <Text style={styles.emptySubtext}>
        Place the probe on a surface to receive data.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>BeriCoat</Text>
            <Text style={styles.headerSubtitle}>Coating Thickness Gauge</Text>
          </View>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={styles.statusDotWrap}>
            <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
            {isConnected && (
              <Animated.View
                style={[styles.statusDotPulse, styles.dotConnected, { opacity: pulseAnim }]}
              />
            )}
          </View>
          <View>
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
            {isReconnecting && (
              <Text style={styles.reconnectingText}>
                Reconnecting ({reconnectAttempts}/10)...
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Text style={styles.disconnectBtnText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Device Info */}
      {connectedDevice && (
        <View style={styles.deviceBar}>
          <Text style={styles.deviceIcon}>📟</Text>
          <View>
            <Text style={styles.deviceName}>{connectedDevice.name}</Text>
            <Text style={styles.deviceAddress}>{connectedDevice.address}</Text>
          </View>
        </View>
      )}

      {/* Measurement Card */}
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[
            styles.cardGlow,
            { opacity: glowOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.measurementCard,
            { transform: [{ scale: valueScale }] },
          ]}
        >
          <Text style={styles.cardLabel}>THICKNESS</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>
              {latestMeasurement ? formatValue(latestMeasurement.value, latestMeasurement.substrate) : '---'}
            </Text>
            <Text style={styles.unitText}>
              {latestMeasurement?.unit === 'um' ? 'µm' : latestMeasurement?.unit === 'mil' ? 'mil' : '---'}
            </Text>
          </View>
          {latestMeasurement && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>Substrate</Text>
                  <Text style={styles.detailChipValue}>
                    {latestMeasurement.substrate ?? 'Auto'}
                  </Text>
                </View>
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>Time</Text>
                  <Text style={styles.detailChipValue}>
                    {formatTimestamp(latestMeasurement.timestamp)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </View>

      {/* History */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>
          History ({history.length})
        </Text>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearHistory}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[...history].reverse()}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={renderHistoryItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={history.length === 0 ? styles.emptyList : styles.historyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#90CAF9',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDotWrap: {
    width: 18,
    height: 18,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
  },
  statusDotPulse: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
  },
  dotConnected: {
    backgroundColor: '#4CAF50',
  },
  dotDisconnected: {
    backgroundColor: '#EF5350',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#263238',
  },
  reconnectingText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 2,
  },
  deviceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FAFCFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  deviceIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
  },
  deviceAddress: {
    fontSize: 11,
    color: '#90A4AE',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  cardWrapper: {
    margin: 16,
    borderRadius: 20,
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: '#1565C0',
  },
  measurementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    elevation: 6,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EDF5',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#90A4AE',
    letterSpacing: 2,
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginTop: 12,
  },
  valueText: {
    fontSize: 72,
    fontWeight: '200',
    color: '#1565C0',
    letterSpacing: -2,
  },
  unitText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#64B5F6',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  detailChip: {
    alignItems: 'center',
  },
  detailChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B0BEC5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailChipValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#455A64',
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#37474F',
  },
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  historyItemLatest: {
    borderColor: '#BBDEFB',
    backgroundColor: '#F5F9FF',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
  },
  historyValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  historyValueText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#263238',
  },
  historyUnit: {
    fontSize: 11,
    color: '#90A4AE',
    marginLeft: 4,
    fontWeight: '600',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  substrateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#ECEFF1',
    marginBottom: 4,
  },
  substrateFe: {
    backgroundColor: '#E8F5E9',
  },
  substrateNFe: {
    backgroundColor: '#FFF3E0',
  },
  substrateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
  },
  substrateFeText: {
    color: '#2E7D32',
  },
  substrateNFeText: {
    color: '#E65100',
  },
  historyTimestamp: {
    fontSize: 11,
    color: '#B0BEC5',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#B0BEC5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  disconnectBtn: {
    backgroundColor: '#EF5350',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#EF5350',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  clearBtn: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#607D8B',
    fontSize: 12,
    fontWeight: '700',
  },
});