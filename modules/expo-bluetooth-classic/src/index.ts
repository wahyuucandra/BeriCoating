import { ExpoBluetoothClassicModule } from './ExpoBluetoothClassicModule';

export { ExpoBluetoothClassicModule };

export interface BluetoothDevice {
  name: string;
  address: string;
  bonded: boolean;
}

export interface BluetoothConnectionEvent {
  address: string;
  name?: string;
}

export interface BluetoothDataEvent {
  address: string;
  data: string;
  hex?: string;
  timestamp: number;
}

export interface BluetoothErrorEvent {
  address?: string;
  code: string;
  message: string;
}

export type BluetoothEvent =
  | { type: 'onConnected'; payload: BluetoothConnectionEvent }
  | { type: 'onDisconnected'; payload: BluetoothConnectionEvent }
  | { type: 'onDataReceived'; payload: BluetoothDataEvent }
  | { type: 'onError'; payload: BluetoothErrorEvent };

export type BluetoothEventListener = (event: BluetoothEvent) => void;