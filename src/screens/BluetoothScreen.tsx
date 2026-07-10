import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useBluetooth } from '../hooks/useBluetooth';
import { bluetoothService } from '../services/BluetoothClassic';
import type { BluetoothDevice } from '../services/BluetoothClassic';

export default function BluetoothScreen() {
  const router = useRouter();
  const {
    devices,
    isScanning,
    scanError,
    isConnected,
    isBluetoothEnabled,
    enableBluetooth,
    requestPermissions,
    checkBluetoothEnabled,
  } = useBluetoothStore();
  const { connectToDevice } = useBluetooth();
  const scan = useBluetoothStore((s) => s.scan);

  useEffect(() => {
    requestPermissions().then(() => {
      checkBluetoothEnabled();
      scan();
    });
  }, []);

  // Re-check Bluetooth state when screen comes back into focus
  useEffect(() => {
    if (isConnected) {
      router.replace('/measurement');
    }
  }, [isConnected, router]);

  const handleEnableBluetooth = useCallback(() => {
    enableBluetooth();
    // After the system dialog, re-check and scan
    setTimeout(() => {
      checkBluetoothEnabled();
      if (bluetoothService.isEnabled()) {
        scan();
      }
    }, 1500);
  }, [enableBluetooth, checkBluetoothEnabled, scan]);

  const handleConnect = useCallback(
    async (device: BluetoothDevice) => {
      await connectToDevice(device.address);
    },
    [connectToDevice]
  );

  const renderBluetoothDisabled = () => (
    <View style={styles.disabledContainer}>
      <Text style={styles.disabledIcon}>🔵</Text>
      <Text style={styles.disabledTitle}>Bluetooth is Disabled</Text>
      <Text style={styles.disabledSubtitle}>
        Enable Bluetooth to scan for your CM-8825FN device.
      </Text>
      <TouchableOpacity
        style={styles.enableButton}
        onPress={handleEnableBluetooth}
        activeOpacity={0.7}
      >
        <Text style={styles.enableButtonText}>Enable Bluetooth</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleConnect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>
      <View style={styles.connectButton}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isScanning ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Devices Found</Text>
          <Text style={styles.emptySubtitle}>
            Make sure your device is paired in Android Bluetooth settings.
          </Text>
          {scanError && (
            <Text style={styles.errorText}>{scanError}</Text>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bluetooth Devices</Text>
        <Text style={styles.headerSubtitle}>CM-8825FN Coating Thickness Gauge</Text>
      </View>

      {!isBluetoothEnabled ? (
        renderBluetoothDisabled()
      ) : (
        <>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.address}
            renderItem={renderDevice}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={devices.length === 0 ? styles.emptyList : styles.list}
            refreshControl={
              <RefreshControl refreshing={isScanning} onRefresh={scan} />
            }
          />

          <TouchableOpacity style={styles.scanButton} onPress={scan} disabled={isScanning}>
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.scanButtonText}>Scan Devices</Text>
            )}
          </TouchableOpacity>
        </>
      )}
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
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  deviceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 16,
  },
  scanButton: {
    backgroundColor: '#1976D2',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  disabledIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 8,
  },
  disabledSubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  enableButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});