import {
  ExpoBluetoothClassicModule,
  type BluetoothDevice,
  type BluetoothEvent,
  type BluetoothEventListener,
} from '../../modules/expo-bluetooth-classic/src';

export type {
  BluetoothDevice,
  BluetoothEvent,
  BluetoothEventListener,
  BluetoothConnectionEvent,
  BluetoothDataEvent,
  BluetoothErrorEvent,
} from '../../modules/expo-bluetooth-classic/src';

const nativeModule = new ExpoBluetoothClassicModule();

export class BluetoothClassicService {
  private listenerId: string | null = null;
  private eventListeners: Set<BluetoothEventListener> = new Set();

  constructor() {
    this.handleEvent = this.handleEvent.bind(this);
  }

  private handleEvent(event: BluetoothEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[BluetoothClassicService] Listener error:', error);
      }
    });
  }

  addEventListener(listener: BluetoothEventListener): void {
    this.eventListeners.add(listener);
    if (this.listenerId === null) {
      this.listenerId = nativeModule.addListener(this.handleEvent);
    }
  }

  removeEventListener(listener: BluetoothEventListener): void {
    this.eventListeners.delete(listener);
    if (this.eventListeners.size === 0 && this.listenerId !== null) {
      nativeModule.removeListener(this.listenerId);
      this.listenerId = null;
    }
  }

  removeAllListeners(): void {
    this.eventListeners.clear();
    if (this.listenerId !== null) {
      nativeModule.removeListener(this.listenerId);
      this.listenerId = null;
    }
    nativeModule.removeAllListeners();
  }

  async scanBondedDevices(): Promise<BluetoothDevice[]> {
    try {
      return await nativeModule.scanBondedDevices();
    } catch (error) {
      console.error('[BluetoothClassicService] scanBondedDevices error:', error);
      throw error;
    }
  }

  async connect(address: string): Promise<boolean> {
    try {
      return await nativeModule.connect(address);
    } catch (error) {
      console.error('[BluetoothClassicService] connect error:', error);
      throw error;
    }
  }

  disconnect(): void {
    try {
      nativeModule.disconnect();
    } catch (error) {
      console.error('[BluetoothClassicService] disconnect error:', error);
    }
  }

  async send(data: string): Promise<void> {
    try {
      await nativeModule.write(data);
    } catch (error) {
      console.error('[BluetoothClassicService] send error:', error);
      throw error;
    }
  }

  async sendHex(hex: string): Promise<void> {
    try {
      await nativeModule.writeHex(hex);
    } catch (error) {
      console.error('[BluetoothClassicService] sendHex error:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    try {
      return nativeModule.isConnected();
    } catch (error) {
      console.error('[BluetoothClassicService] isConnected error:', error);
      return false;
    }
  }

  isEnabled(): boolean {
    try {
      return nativeModule.isEnabled();
    } catch (error) {
      console.error('[BluetoothClassicService] isEnabled error:', error);
      return false;
    }
  }

  requestEnable(): void {
    nativeModule.requestEnable();
  }

  async requestPermissions(): Promise<boolean> {
    return nativeModule.requestPermissions();
  }

  startListening(): void {
    nativeModule.startListening();
  }

  stopListening(): void {
    nativeModule.stopListening();
  }
}

export const bluetoothService = new BluetoothClassicService();