import React, { useEffect, useCallback, useMemo, useState } from 'react';
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
import { useSnackbarStore } from '../store/useSnackbarStore';
import { useBluetooth } from '../hooks/useBluetooth';
import { bluetoothService } from '../services/BluetoothClassic';
import type { BluetoothDevice } from '../services/BluetoothClassic';
import { TabBar } from '../components/TabBar';
import { ConnectingModal } from '../components/ConnectingModal';

/** Device yang mengandung "CM" di nama — kemungkinan CM-8825FN gauge. */
const isCMDevice = (d: BluetoothDevice) =>
  d.name.toUpperCase().includes('CM');

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
  const connectionError = useBluetoothStore((s) => s.connectionError);
  const isConnecting = useBluetoothStore((s) => s.isConnecting);
  const connectingAddress = useBluetoothStore((s) => s.connectingAddress);
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [activeTab, setActiveTab] = useState<'all' | 'cm'>('cm');

  // CM devices first, then the rest — all devices shown
  const sortedDevices = useMemo(() => {
    const cm = devices.filter(isCMDevice);
    const others = devices.filter((d) => !isCMDevice(d));
    const all = [...cm, ...others];

    if (activeTab === 'cm') {
      return all.filter(isCMDevice);
    }
    return all;
  }, [devices, activeTab]);

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

  // Show snackbar when errors occur
  useEffect(() => {
    if (scanError) {
      showSnackbar(scanError, 'error');
    }
  }, [scanError, showSnackbar]);

  useEffect(() => {
    if (connectionError) {
      showSnackbar(connectionError, 'error');
    }
  }, [connectionError, showSnackbar]);

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

  const renderDevice = ({ item }: { item: BluetoothDevice }) => {
    const isCM = isCMDevice(item);
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isCM && styles.deviceItemCM]}
        onPress={() => handleConnect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceInfo}>
          <View style={styles.deviceNameRow}>
            <Text style={styles.deviceName}>{item.name}</Text>
            {isCM && (
              <View style={styles.cmBadge}>
                <Text style={styles.cmBadgeText}>CM</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceAddress}>{item.address}</Text>
        </View>
        <View style={[styles.connectButton, isCM && styles.connectButtonCM]}>
          <Text style={styles.connectButtonText}>Connect</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isScanning ? (
        <>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.emptyTitle}>Scanning...</Text>
          <Text style={styles.emptySubtitle}>
            Looking for nearby Bluetooth devices
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>No Devices Found</Text>
          <Text style={styles.emptySubtitle}>
            Pastikan alat CM-8825FN sudah di-pair di{'\n'}
            pengaturan Bluetooth Android terlebih dahulu.
          </Text>
          <View style={styles.emptySteps}>
            <View style={styles.emptyStep}>
              <Text style={styles.emptyStepNumber}>1</Text>
              <Text style={styles.emptyStepText}>
                Buka <Text style={styles.emptyStepBold}>Settings → Bluetooth</Text> di Android
              </Text>
            </View>
            <View style={styles.emptyStep}>
              <Text style={styles.emptyStepNumber}>2</Text>
              <Text style={styles.emptyStepText}>
                Nyalakan alat <Text style={styles.emptyStepBold}>CM-8825FN</Text>
              </Text>
            </View>
            <View style={styles.emptyStep}>
              <Text style={styles.emptyStepNumber}>3</Text>
              <Text style={styles.emptyStepText}>
                Tap <Text style={styles.emptyStepBold}>Pair new device</Text> lalu pilih CM-8825FN
              </Text>
            </View>
            <View style={styles.emptyStep}>
              <Text style={styles.emptyStepNumber}>4</Text>
              <Text style={styles.emptyStepText}>
                Kembali ke aplikasi dan tap <Text style={styles.emptyStepBold}>Scan</Text>
              </Text>
            </View>
          </View>
          {scanError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{scanError}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ConnectingModal
        visible={isConnecting}
        deviceAddress={connectingAddress ?? ''}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bluetooth Devices</Text>
        <Text style={styles.headerSubtitle}>CM-8825FN Coating Thickness Gauge</Text>
      </View>

      {!isBluetoothEnabled ? (
        renderBluetoothDisabled()
      ) : (
        <>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          <FlatList
            data={sortedDevices}
            keyExtractor={(item) => item.address}
            renderItem={renderDevice}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={sortedDevices.length === 0 ? styles.emptyList : styles.list}
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
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cmBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cmBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1976D2',
  },
  deviceItemCM: {
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  connectButtonCM: {
    backgroundColor: '#1976D2',
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
    padding: 24,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptySteps: {
    marginTop: 24,
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  emptyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  emptyStepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1976D2',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
    marginRight: 12,
    marginTop: -1,
  },
  emptyStepText: {
    flex: 1,
    fontSize: 14,
    color: '#616161',
    lineHeight: 22,
  },
  emptyStepBold: {
    fontWeight: '700',
    color: '#424242',
  },
  errorBox: {
    marginTop: 20,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
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