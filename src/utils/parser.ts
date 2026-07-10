import type { Measurement, MeasurementWithTimestamp } from '../types/measurement';

export type { Measurement, MeasurementWithTimestamp };

/**
 * Parser for CM-8825FN coating thickness gauge binary protocol.
 *
 * ============================================================
 * FRAME STRUCTURE (11 bytes fixed)
 * ============================================================
 *
 *   Byte:  0    1    2    3    4    5    6    7    8    9   10
 *        ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
 *        │ 10 │ 08 │ 07 │ TT │ 0A │ 0A │ XX │ XX │ XX │ RR │ CS │
 *        └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
 *          └─ Preamble ─┘  │  └─ Delimiter ─┘  └─ Payload ─┘  │
 *                          │                                     │
 *                     Type byte                             Checksum
 *                                                       sum(0..9) & 0xFF
 *
 * TYPE BYTE (byte 3):
 *   High nibble = substrate:
 *     1 = Fe (ferrous)
 *     2 = NFe (non-ferrous)
 *   Low nibble = unit:
 *     1 = µm
 *     2 = mil
 *
 *   Hanya frame dengan unit nibble 1 atau 2 yang di-parse sebagai measurement.
 *   Frame dengan unit nibble lain (misal 0x21 = status event) diabaikan.
 *
 * PAYLOAD (byte 6-8): BCD value, variable width
 *   Jika byte6 ≤ 9:  3-byte BCD → (byte6×100 + byte7×10 + byte8)
 *   Jika byte6 > 9:  2-byte BCD → (byte7×10 + byte8)
 *                    byte6 adalah flag, diabaikan
 *
 *   Nilai akhir:
 *     Fe:  selalu /10
 *     NFe: /10 untuk mil, raw untuk µm
 *
 * RESERVED (byte 9): selalu 0x01
 *
 * CHECKSUM (byte 10): (sum bytes 0..9) & 0xFF
 *
 * ============================================================
 * CONFIRMED EXAMPLES
 * ============================================================
 *
 *   10 08 07 11 0A 0A 04 02 04 01 3F
 *     → type=0x11, substrate=Fe, unit=µm
 *     → BCD: 4×100 + 2×10 + 4 = 424, /10 = 42.4 µm
 *
 *   10 08 07 12 0A 0A 0A 01 06 01 47
 *     → type=0x12, substrate=Fe, unit=mil
 *     → BCD: byte6=0x0A(10) > 9 → 2-byte: 1×10 + 6 = 16, /10 = 1.6 mil
 *
 *   10 08 07 12 0A 0A 02 07 00 01 3F
 *     → type=0x12, substrate=Fe, unit=mil
 *     → BCD: 2×100 + 7×10 + 0 = 270, /10 = 27.0 mil
 *
 *   10 08 07 21 0A 0A 05 02 00 01 4C
 *     → type=0x21, substrate=NFe, unit=µm
 *     → BCD: 5×100 + 2×10 + 0 = 520, /10 = 52.0 µm
 *
 *   10 08 07 11 0A 0A 01 09 09 01 48
 *     → type=0x11, substrate=Fe, unit=µm
 *     → BCD: 1×100 + 9×10 + 9 = 199, /10 = 19.9 µm
 *
 * ============================================================
 * ASCII TEXT FORMAT (fallback)
 * ============================================================
 *
 * Jika gauge mengirim data dalam format teks (jarang), parser akan
 * fallback ke format berikut:
 *
 *   "245.5"          → { substrate: null, value: 245.5, unit: null }
 *   "Fe,245.5,um"    → { substrate: "Fe", value: 245.5, unit: "um" }
 *   "NFe,87,mil"     → { substrate: "NFe", value: 87, unit: "mil" }
 */
export function parseMeasurement(raw: string, hex?: string): Measurement | null {
  // Try binary protocol first (if hex data available)
  if (hex) {
    const binary = parseBinaryFrame(hex);
    if (binary) return binary;
  }

  // Fallback to ASCII text parser
  return parseTextMeasurement(raw);
}

/**
 * Parse CM-8825FN 11-byte binary frame.
 *
 * Called from parseMeasurement() when hex data is available from
 * the Bluetooth native module (BluetoothDataEvent.hex).
 *
 * Returns null if:
 *   - Frame < 11 bytes
 *   - Preamble (10 08 07) or delimiter (0A 0A) mismatch
 *   - Unit nibble is not 1 (µm) or 2 (mil) — i.e. status/event frames
 *
 * See file-header comment for full protocol specification.
 */
function parseBinaryFrame(hex: string): Measurement | null {
  try {
    const bytes = hex
      .trim()
      .split(/\s+/)
      .map((h) => parseInt(h, 16));

    if (bytes.length < 11) return null;

    // Verify preamble: 10 08 07
    if (bytes[0] !== 0x10 || bytes[1] !== 0x08 || bytes[2] !== 0x07) {
      return null;
    }

    // Verify delimiter: 0A 0A
    if (bytes[4] !== 0x0a || bytes[5] !== 0x0a) {
      return null;
    }

    const type = bytes[3];
    const substrateNibble = (type >> 4) & 0x0f; // high nibble
    const unitNibble = type & 0x0f;               // low nibble = unit

    // Accept measurement frames (unit nibble 1=µm, 2=mil)
    if (unitNibble !== 1 && unitNibble !== 2) return null;

    // Substrate: 1=Fe, 2=NFe
    const substrate = (
      substrateNibble === 1 ? 'Fe' as const
      : substrateNibble === 2 ? 'NFe' as const
      : null
    );

    // Unit: low nibble 1=µm, 2=mil
    const unit = unitNibble === 1 ? 'um' as const : 'mil' as const;

    // BCD value: variable width
    // byte6 ≤ 9 → 3-byte BCD (hundreds, tens, ones)
    // byte6 > 9 → byte6 is flag, 2-byte BCD (tens, ones)
    const b0 = bytes[6];
    const b1 = bytes[7];
    const b2 = bytes[8];
    let rawValue: number;
    if (b0 <= 9) {
      rawValue = b0 * 100 + b1 * 10 + b2;
    } else {
      rawValue = b1 * 10 + b2;
    }

    // Fe: always /10. NFe: /10 for mil, raw for µm
    const value = (substrate === 'NFe' && unit === 'um') ? rawValue : rawValue / 10;

    return {
      substrate,
      value,
      unit,
      raw: hex,
    };
  } catch {
    return null;
  }
}

/** Narrow a string to substrate literal type. */
function asSubstrate(raw: string): 'Fe' | 'NFe' | null {
  const normalized = raw.toLowerCase();
  if (normalized === 'fe') return 'Fe';
  if (normalized === 'nfe') return 'NFe';
  return null;
}

/** Narrow a string to unit literal type. */
function asUnit(raw: string): 'um' | 'mil' | null {
  const normalized = raw.toLowerCase();
  if (normalized === 'um' || normalized === 'µm' || normalized === 'μm') return 'um';
  if (normalized === 'mil' || normalized === 'mils') return 'mil';
  return null;
}

/**
 * Parse ASCII text measurement (legacy format).
 */
function parseTextMeasurement(raw: string): Measurement | null {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Try comma-separated format: substrate,value,unit
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim());

    if (parts.length >= 2) {
      const substrate = asSubstrate(parts[0]);
      const value = parseFloat(parts[1]);
      const unit = parts.length >= 3 ? asUnit(parts[2]) : null;

      if (!isNaN(value)) {
        return {
          substrate,
          value,
          unit,
          raw: trimmed,
        };
      }

      // If the first part is numeric, treat as single value
      const firstValue = parseFloat(parts[0]);
      if (!isNaN(firstValue)) {
        return {
          substrate: null,
          value: firstValue,
          unit: null,
          raw: trimmed,
        };
      }

      return null;
    }
  }

  // Try plain numeric value
  const numericValue = parseFloat(trimmed);
  if (!isNaN(numericValue)) {
    return {
      substrate: null,
      value: numericValue,
      unit: null,
      raw: trimmed,
    };
  }

  return null;
}

/**
 * Parse a buffer of data that may contain multiple measurements.
 * Splits by newlines and returns all valid measurements.
 */
export function parseMeasurementsBuffer(data: string): Measurement[] {
  const lines = data.split(/\r?\n/);
  const measurements: Measurement[] = [];

  for (const line of lines) {
    const measurement = parseMeasurement(line);
    if (measurement) {
      measurements.push(measurement);
    }
  }

  return measurements;
}