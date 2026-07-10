import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
    fractionalSecondDigits: 3,
  });
}

export default function MeasurementScreen() {
  const router = useRouter();
  const { connectedDevice, isConnected, latestMeasurement, history, clearHistory } = useBluetoothStore();
  const { disconnectDevice, isReconnecting, reconnectAttempts } = useBluetooth();

  const handleDisconnect = useCallback(() => {
    disconnectDevice();
    router.replace('/');
  }, [disconnectDevice, router]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  const formatValue = (value: number, substrate: string | null): string => {
    // NFe: integer, Fe: 1 decimal
    return substrate === 'NFe' ? value.toString() : value.toFixed(1);
  };

  const renderHistoryItem = ({ item }: { item: MeasurementWithTimestamp }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyValue}>
        <Text style={styles.historyValueText}>
          {formatValue(item.value, item.substrate)}
        </Text>
        <Text style={styles.historyUnitText}>
          {item.unit === 'um' ? 'µm' : item.unit === 'mil' ? 'mil' : '---'}
        </Text>
      </View>
      <View style={styles.historyMeta}>
        <Text style={styles.historySubstrate}>
          {item.substrate ?? '---'}
        </Text>
        <Text style={styles.historyTimestamp}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
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
        <Text style={styles.headerTitle}>CM-8825FN</Text>
        <Text style={styles.headerSubtitle}>Coating Thickness Gauge</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          {isReconnecting && (
            <Text style={styles.reconnectingText}>
              Reconnecting ({reconnectAttempts}/10)...
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Device Info */}
      {connectedDevice && (
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{connectedDevice.name}</Text>
          <Text style={styles.deviceAddress}>{connectedDevice.address}</Text>
        </View>
      )}

      {/* Latest Measurement */}
      <View style={styles.measurementCard}>
        <Text style={styles.measurementLabel}>THICKNESS</Text>
        <View style={styles.measurementValueContainer}>
          <Text style={styles.measurementValue}>
            {latestMeasurement ? formatValue(latestMeasurement.value, latestMeasurement.substrate) : '---'}
          </Text>
          <Text style={styles.measurementUnit}>
            {latestMeasurement?.unit === 'um' ? 'µm' : latestMeasurement?.unit === 'mil' ? 'mil' : '---'}
          </Text>
        </View>
        {latestMeasurement && (
          <>
            <View style={styles.measurementDivider} />
            <View style={styles.measurementDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Substrate</Text>
                <Text style={styles.detailValue}>
                  {latestMeasurement.substrate ?? 'Auto'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Timestamp</Text>
                <Text style={styles.detailValue}>
                  {formatTimestamp(latestMeasurement.timestamp)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* History */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>
            History ({history.length})
          </Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...history].reverse()}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={renderHistoryItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={history.length === 0 ? styles.emptyList : styles.historyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1976D2',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BBDEFB',
    marginTop: 4,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    flex: 1,
  },
  reconnectingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  deviceInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  measurementCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  measurementLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9E9E9E',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  measurementValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginTop: 8,
  },
  measurementValue: {
    fontSize: 64,
    fontWeight: '300',
    color: '#212121',
  },
  measurementUnit: {
    fontSize: 24,
    fontWeight: '500',
    color: '#757575',
    marginLeft: 8,
  },
  measurementDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  measurementDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginTop: 4,
  },
  historySection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#424242',
  },
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  historyValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 100,
  },
  historyValueText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212121',
  },
  historyUnitText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  historyMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  historySubstrate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
  },
  historyTimestamp: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  clearButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#616161',
    fontSize: 12,
    fontWeight: '600',
  },
});