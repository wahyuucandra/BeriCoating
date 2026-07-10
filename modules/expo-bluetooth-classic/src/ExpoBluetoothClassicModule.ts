import { requireNativeModule, EventEmitter } from 'expo-modules-core';

import type {
  BluetoothDevice,
  BluetoothConnectionEvent,
  BluetoothDataEvent,
  BluetoothErrorEvent,
  BluetoothEventListener,
} from './index';

interface BluetoothClassicModuleNative {
  scanBondedDevices(): Promise<BluetoothDevice[]>;
  connect(address: string): Promise<boolean>;
  disconnect(): void;
  write(data: string): Promise<void>;
  writeHex(hex: string): Promise<void>;
  isConnected(): boolean;
  isEnabled(): boolean;
  requestEnable(): void;
  requestPermissions(): Promise<boolean>;
  startListening(): void;
  stopListening(): void;
}

class ExpoBluetoothClassicModule {
  private module: BluetoothClassicModuleNative;
  private emitter: EventEmitter;
  private listeners: Map<string, BluetoothEventListener>;

  constructor() {
    this.module = requireNativeModule<BluetoothClassicModuleNative>(
      'BluetoothClassic'
    );
    this.emitter = new EventEmitter(this.module as any);
    this.listeners = new Map();
  }

  async scanBondedDevices(): Promise<BluetoothDevice[]> {
    return this.module.scanBondedDevices();
  }

  async connect(address: string): Promise<boolean> {
    return this.module.connect(address);
  }

  disconnect(): void {
    this.module.disconnect();
  }

  async write(data: string): Promise<void> {
    return this.module.write(data);
  }

  async writeHex(hex: string): Promise<void> {
    return this.module.writeHex(hex);
  }

  isConnected(): boolean {
    return this.module.isConnected();
  }

  isEnabled(): boolean {
    return this.module.isEnabled();
  }

  requestEnable(): void {
    this.module.requestEnable();
  }

  async requestPermissions(): Promise<boolean> {
    return this.module.requestPermissions();
  }

  startListening(): void {
    this.module.startListening();
  }

  stopListening(): void {
    this.module.stopListening();
  }

  addListener(listener: BluetoothEventListener): string {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.set(id, listener);

    if (this.listeners.size === 1) {
      this.subscribeToNativeEvents();
    }

    return id;
  }

  removeListener(id: string): void {
    this.listeners.delete(id);

    if (this.listeners.size === 0) {
      this.unsubscribeFromNativeEvents();
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
    this.unsubscribeFromNativeEvents();
  }

  private subscribeToNativeEvents(): void {
    this.emitter.addListener('onConnected', (event: BluetoothConnectionEvent) => {
      this.notifyListeners({ type: 'onConnected', payload: event });
    });

    this.emitter.addListener('onDisconnected', (event: BluetoothConnectionEvent) => {
      this.notifyListeners({ type: 'onDisconnected', payload: event });
    });

    this.emitter.addListener('onDataReceived', (event: BluetoothDataEvent) => {
      this.notifyListeners({ type: 'onDataReceived', payload: event });
    });

    this.emitter.addListener('onError', (event: BluetoothErrorEvent) => {
      this.notifyListeners({ type: 'onError', payload: event });
    });
  }

  private unsubscribeFromNativeEvents(): void {
    this.emitter.removeAllListeners('onConnected');
    this.emitter.removeAllListeners('onDisconnected');
    this.emitter.removeAllListeners('onDataReceived');
    this.emitter.removeAllListeners('onError');
  }

  private notifyListeners(event: {
    type: 'onConnected' | 'onDisconnected' | 'onDataReceived' | 'onError';
    payload: BluetoothConnectionEvent | BluetoothDataEvent | BluetoothErrorEvent;
  }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event as any);
      } catch (error) {
        console.error('[BluetoothClassic] Listener error:', error);
      }
    });
  }
}

export { ExpoBluetoothClassicModule };