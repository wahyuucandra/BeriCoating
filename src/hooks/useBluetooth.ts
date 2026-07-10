import { useEffect, useRef, useCallback } from 'react';
import { bluetoothService } from '../services/BluetoothClassic';
import type { BluetoothEvent } from '../services/BluetoothClassic';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { parseMeasurement } from '../utils/parser';
import type { MeasurementWithTimestamp } from '../types/measurement';
import { logger } from '../utils/logger';

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL_MS = 3000;

export function useBluetooth() {
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAddressRef = useRef<string | null>(null);

  const {
    connect,
    disconnect,
    addMeasurement,
    setDisconnected,
    setConnected,
    resetReconnect,
    incrementReconnect,
    reconnectAttempts,
    isReconnecting,
    connectedDevice,
  } = useBluetoothStore();

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (address: string) => {
      const attempts = useBluetoothStore.getState().reconnectAttempts;
      if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.warn(`Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached for ${address}`);
        resetReconnect();
        return;
      }

      logger.info(`Scheduling reconnect attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS} for ${address}`);
      incrementReconnect();

      reconnectTimerRef.current = setTimeout(async () => {
        try {
          await connect(address);
          resetReconnect();
        } catch (error: any) {
          logger.warn(`Reconnect attempt ${attempts + 1} failed: ${error?.message}`);
          if (useBluetoothStore.getState().reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            scheduleReconnect(address);
          }
        }
      }, RECONNECT_INTERVAL_MS);
    },
    [connect, resetReconnect, incrementReconnect]
  );

  useEffect(() => {
    const handleEvent = (event: BluetoothEvent) => {
      switch (event.type) {
        case 'onConnected': {
          logger.info(`Device connected: ${event.payload.name ?? event.payload.address}`);

          // Reject auto-reconnect if user manually disconnected
          if (useBluetoothStore.getState().disconnectRequested) {
            logger.info('Rejecting auto-reconnect — user manually disconnected, disconnecting...');
            bluetoothService.disconnect();
            break;
          }

          const device = useBluetoothStore.getState().devices.find(
            (d) => d.address === event.payload.address
          ) ?? {
            name: event.payload.name ?? 'Unknown',
            address: event.payload.address,
            bonded: false,
          };
          setConnected(device);
          lastAddressRef.current = event.payload.address;
          resetReconnect();
          break;
        }

        case 'onDisconnected': {
          logger.info(`Device disconnected: ${event.payload.name ?? event.payload.address}`);
          setDisconnected();

          if (useBluetoothStore.getState().disconnectRequested) {
            break;
          }

          const address = event.payload.address || lastAddressRef.current;
          if (address) {
            scheduleReconnect(address);
          }
          break;
        }

        case 'onDataReceived': {
          logger.packet(
            event.payload.data,
            event.payload.hex,
            event.payload.address
          );
          const measurement = parseMeasurement(
            event.payload.data,
            event.payload.hex
          );
          if (measurement) {
            const withTimestamp: MeasurementWithTimestamp = {
              ...measurement,
              timestamp: event.payload.timestamp || Date.now(),
            };
            addMeasurement(withTimestamp);
            logger.debug('Parsed measurement:', JSON.stringify(withTimestamp));
          } else {
            logger.warn('Failed to parse packet:', event.payload.data);
          }
          break;
        }

        case 'onError': {
          logger.error('Bluetooth error:', event.payload.code, event.payload.message);
          break;
        }
      }
    };

    bluetoothService.addEventListener(handleEvent);
    bluetoothService.startListening();

    return () => {
      clearReconnectTimer();
      bluetoothService.removeEventListener(handleEvent);
      bluetoothService.stopListening();
    };
  }, [addMeasurement, setConnected, setDisconnected, resetReconnect, scheduleReconnect, clearReconnectTimer]);

  const connectToDevice = useCallback(
    async (address: string) => {
      useBluetoothStore.setState({ disconnectRequested: false });
      lastAddressRef.current = address;
      await connect(address);
    },
    [connect]
  );

  const disconnectDevice = useCallback(() => {
    useBluetoothStore.setState({ disconnectRequested: true });
    clearReconnectTimer();
    lastAddressRef.current = null;
    disconnect();
    resetReconnect();
  }, [disconnect, clearReconnectTimer, resetReconnect]);

  return {
    connectToDevice,
    disconnectDevice,
    isReconnecting,
    reconnectAttempts,
    lastAddress: lastAddressRef.current,
  };
}