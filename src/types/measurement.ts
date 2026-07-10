/** Core measurement types for CM-8825FN coating thickness gauge. */

export interface Measurement {
  substrate: 'Fe' | 'NFe' | null;
  value: number;
  unit: 'um' | 'mil' | null;
  raw: string;
}

export interface MeasurementWithTimestamp extends Measurement {
  timestamp: number;
}