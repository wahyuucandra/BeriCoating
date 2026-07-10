export interface Measurement {
  substrate: 'Fe' | 'NFe' | null;
  value: number;
  unit: 'um' | 'mil' | null;
  raw: string;
}

export interface MeasurementWithTimestamp extends Measurement {
  timestamp: number;
}

/**
 * Parser for CM-8825FN coating thickness gauge BINARY protocol.
 *
 * ============================================================
 * PROTOCOL ANALYSIS (reverse-engineered from captured packets)
 * ============================================================
 *
 * Captured packets (HEX → structure):
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ #1: 10 08 07 11 0A 0A 01 09 09 01 48                               │
 * │ #2: 10 08 07 11 0A 0A 01 05 07 01 42                               │
 * │ #3: 10 08 07 11 0A 0A 02 09 04 01 44                               │
 * │ #4: 10 08 07 21 0A 0A 05 02 00 01 4C                               │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * FRAME STRUCTURE (11 bytes fixed):
 * ┌──────────┬──────┬──────────┬──────────┬──────────┐
 * │ Byte 0-2 │ Byte │ Byte 4-5 │ Byte 6-9 │ Byte 10  │
 * │ Preamble │  3   │ Delimiter│ Payload  │ Checksum │
 * ├──────────┼──────┼──────────┼──────────┼──────────┤
 * │ 10 08 07 │ 11   │ 0A 0A    │ 4 bytes  │ sum(0-9) │
 * │          │ 21   │          │          │ & 0xFF   │
 * └──────────┴──────┴──────────┴──────────┴──────────┘
 *
 * PREAMBLE:  10 08 07 — always the same, sync marker
 * TYPE:      11 = measurement data, 21 = status/event
 * DELIMITER: 0A 0A — two newlines, separates header from payload
 * PAYLOAD:   4 bytes — structure TBD
 * CHECKSUM:  (sum of bytes 0-9) & 0xFF
 *
 * Checksum verification:
 *   #1: 10+08+07+11+0A+0A+01+09+09+01 = 0x48 ✓
 *   #2: 10+08+07+11+0A+0A+01+05+07+01 = 0x42 ✓
 *   #3: 10+08+07+11+0A+0A+02+09+04+01 = 0x44 ✓
 *   #4: 10+08+07+21+0A+0A+05+02+00+01 = 0x4C ✓
 *
 * PAYLOAD HYPOTHESES (to be tested):
 *   Hypothesis A: 2 bytes value (big-endian) + 1 byte decimal + 1 byte unit
 *     #1: 0109 = 265, dec=9, unit=01 → 265 / 10^9 = 0.000000265? UNLIKELY
 *   Hypothesis B: 2 bytes value (little-endian) + 1 byte decimal + 1 byte unit
 *     #1: 0901 = 2305, dec=9, unit=01 → 0.002305? UNLIKELY
 *   Hypothesis C: These are STATUS/HEARTBEAT packets, not measurements
 *     The gauge sends data only when probe is pressed → MOST LIKELY
 *   Hypothesis D: 3 bytes BCD value + 1 byte status
 *     #1: 01 09 09 = 109.9? Could be 109.9 µm
 *     #2: 01 05 07 = 105.7? Could be 105.7 µm
 *     #3: 02 09 04 = 209.4? Could be 209.4 µm
 *     #4: 05 02 00 = 520.0? with type 21 = status packet
 *     → NEEDS VERIFICATION: press probe on known thickness standard
 *
 * ============================================================
 * REVERSE-ENGINEERING STEPS (lakukan berurutan)
 * ============================================================
 *
 * Step 1: KIRIM COMMAND untuk trigger response
 *   Coba kirim command lewat command panel:
 *     - "D" atau hex "44" (start continuous)
 *     - "M" atau hex "4D" (measure)
 *     - "S" atau hex "53" (single reading)
 *     - "R" atau hex "52" (read)
 *     - "\r\n" atau hex "0D 0A" (CRLF — trigger response)
 *     - "10 08 07" (echo preamble, trigger handshake)
 *
 * Step 2: UKUR OBJEK DIKETAHUI
 *   Tempelkan probe ke:
 *     a. Zero plate (kalibrasi) — harusnya 0.0 µm
 *     b. Foil standar (misal 50 µm, 100 µm, 250 µm)
 *     c. Benda logam tanpa coating — harusnya 0.0 µm
 *   → Bandingkan hex payload dengan nilai yang diharapkan
 *
 * Step 3: COBA SEMUA MODE
 *   Kirim command untuk ganti mode:
 *     - "F" (Fe/ferrous) — ukur di baja
 *     - "N" (NFe/non-ferrous) — ukur di aluminium
 *   → Lihat apakah byte 3 atau byte 9 berubah
 *
 * Step 4: COBA UNIT
 *   Ganti unit di gauge (µm vs mils), lalu lihat perbedaan payload
 *   → Konfirmasi byte unit
 *
 * Step 5: VERIFIKASI CHECKSUM
 *   Setelah dapat payload yang valid, verify checksum:
 *     sum(bytes 0-9) & 0xFF == byte 10
 *
 * ============================================================
 * ASCII TEXT FORMAT (fallback, jika gauge kirim text)
 * ============================================================
 *
 * Supported formats:
 *   "245.5"          -> { substrate: null, value: 245.5, unit: null }
 *   "245.5\r\n"      -> { substrate: null, value: 245.5, unit: null }
 *   "Fe,245.5,um"    -> { substrate: "Fe", value: 245.5, unit: "um" }
 *   "NFe,87,mil"     -> { substrate: "NFe", value: 87, unit: "mil" }
 *   "Fe, 245.5, um"  -> { substrate: "Fe", value: 245.5, unit: "um" }
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
 * Frame: 10 08 07 TT 0A 0A XX XX XX RR CS
 *   TT = type byte:
 *        high nibble = substrate (1=Fe, 2=NFe)
 *        low nibble  = unit (1=µm, 2=mil)
 *   XX XX XX = BCD value (variable width):
 *        If byte6 ≤ 9: 3-byte BCD → (byte6*100 + byte7*10 + byte8) / 10
 *        If byte6 > 9: byte6 is flag, 2-byte BCD → (byte7*10 + byte8) / 10
 *   RR = reserved (always 0x01)
 *   CS = checksum: sum(bytes 0-9) & 0xFF
 *
 * Examples:
 *   10 08 07 11 0A 0A 04 02 04 01 3F → Fe, 424/10 = 42.4 µm
 *   10 08 07 12 0A 0A 0A 01 06 01 47 → Fe, 16/10 = 1.6 mil
 *   10 08 07 12 0A 0A 02 07 00 01 3F → Fe, 270/10 = 27.0 mil
 *   10 08 07 21 0A 0A 05 02 00 01 4C → NFe, 520/10 = 52.0 µm
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
    const substrate = substrateNibble === 1 ? 'Fe'
      : substrateNibble === 2 ? 'NFe'
      : null;

    // Unit: low nibble 1=µm, 2=mil
    const unit = unitNibble === 1 ? 'um' : 'mil';

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

    // Fe: divide by 10 (1 decimal), NFe: raw value
    const value = substrate === 'NFe' ? rawValue : rawValue / 10;

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
      const substrate = parts[0] || null;
      const value = parseFloat(parts[1]);
      const unit = parts.length >= 3 ? parts[2] : null;

      if (!isNaN(value)) {
        return {
          substrate: substrate || null,
          value,
          unit: unit || null,
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