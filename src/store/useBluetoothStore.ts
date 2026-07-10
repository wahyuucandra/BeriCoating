import { create } from 'zustand';
import type { BluetoothDevice } from '../services/BluetoothClassic';
import { bluetoothService } from '../services/BluetoothClassic';
import { parseMeasurement } from '../utils/parser';
import type { MeasurementWithTimestamp } from '../types/measurement';
import { logger } from '../utils/logger';

interface BluetoothState {
  // Device list
  devices: BluetoothDevice[];
  isScanning: boolean;
  scanError: string | null;

  // Bluetooth state
  isBluetoothEnabled: boolean;

  // Connection
  connectedDevice: BluetoothDevice | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectingAddress: string | null;
  connectionError: string | null;

  // Data
  latestMeasurement: MeasurementWithTimestamp | null;
  history: MeasurementWithTimestamp[];

  // Auto reconnect
  reconnectAttempts: number;
  isReconnecting: boolean;
  disconnectRequested: boolean;

  // Actions
  scan: () => Promise<void>;
  enableBluetooth: () => void;
  requestPermissions: () => Promise<void>;
  checkBluetoothEnabled: () => boolean;
  connect: (address: string) => Promise<void>;
  disconnect: () => void;
  clearHistory: () => void;
  setConnected: (device: BluetoothDevice | null) => void;
  setDisconnected: () => void;
  addMeasurement: (measurement: MeasurementWithTimestamp) => void;
  resetReconnect: () => void;
  incrementReconnect: () => void;
}

export const useBluetoothStore = create<BluetoothState>((set, get) => ({
  devices: [],
  isScanning: false,
  scanError: null,

  isBluetoothEnabled: false,

  connectedDevice: null,
  isConnected: false,
  isConnecting: false,
  connectingAddress: null,
  connectionError: null,

  latestMeasurement: null,
  history: [],

  reconnectAttempts: 0,
  isReconnecting: false,
  disconnectRequested: false,

  enableBluetooth: () => {
    bluetoothService.requestEnable();
  },

  requestPermissions: async () => {
    try {
      await bluetoothService.requestPermissions();
    } catch (error: any) {
      logger.error('Failed to request permissions:', error?.message);
    }
  },

  checkBluetoothEnabled: () => {
    const enabled = bluetoothService.isEnabled();
    set({ isBluetoothEnabled: enabled });
    return enabled;
  },

  scan: async () => {
    // Check if Bluetooth is enabled before scanning
    const enabled = bluetoothService.isEnabled();
    set({ isBluetoothEnabled: enabled });

    if (!enabled) {
      set({ scanError: 'Bluetooth is not enabled', isScanning: false });
      return;
    }

    set({ isScanning: true, scanError: null });
    try {
      logger.info('Scanning bonded devices...');
      const devices = await bluetoothService.scanBondedDevices();
      logger.info(`Found ${devices.length} bonded device(s)`);
      set({ devices, isScanning: false });
    } catch (error: any) {
      const message = error?.message ?? 'Failed to scan devices';
      logger.error('Scan failed:', message);
      set({ scanError: message, isScanning: false });
    }
  },

  connect: async (address: string) => {
    set({ connectionError: null, isReconnecting: false, isConnecting: true, connectingAddress: address });
    try {
      logger.info(`Connecting to ${address}...`);
      await bluetoothService.connect(address);
      const devices = get().devices;
      const device = devices.find((d) => d.address === address) ?? {
        name: 'Unknown',
        address,
        bonded: false,
      };
      set({ connectedDevice: device, isConnected: true, isConnecting: false, connectionError: null, reconnectAttempts: 0 });
      logger.info(`Connected to ${device.name} (${address})`);
    } catch (error: any) {
      const message = error?.message ?? 'Connection failed';
      logger.error('Connection failed:', message);
      set({ connectionError: message, isConnected: false, isConnecting: false });
    }
  },

  disconnect: () => {
    logger.info('Disconnecting...');
    bluetoothService.disconnect();
    set({ connectedDevice: null, isConnected: false, isConnecting: false, connectingAddress: null, isReconnecting: false, reconnectAttempts: 0 });
  },

  clearHistory: () => {
    set({ history: [], latestMeasurement: null });
  },

  setConnected: (device) => {
    set({ connectedDevice: device, isConnected: true, isConnecting: false, connectingAddress: null, connectionError: null });
  },

  setDisconnected: () => {
    set({ connectedDevice: null, isConnected: false, isConnecting: false, connectingAddress: null });
  },

  addMeasurement: (measurement) => {
    set((state) => ({
      latestMeasurement: measurement,
      history: [...state.history.slice(-499), measurement],
    }));
  },

  resetReconnect: () => {
    set({ reconnectAttempts: 0, isReconnecting: false });
  },

  incrementReconnect: () => {
    set((state) => ({
      reconnectAttempts: state.reconnectAttempts + 1,
      isReconnecting: true,
    }));
  },
}));