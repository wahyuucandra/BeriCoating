# Dokumentasi Parser CM-8825FN

## Alur Data: dari Paket Bluetooth ke Objek Measurement

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. CM-8825FN gauge mengirim 11-byte frame via Bluetooth SPP         │
│    (alat mengirim otomatis, tidak perlu command)                     │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ RFCOMM socket
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. BluetoothClassicModule.kt (native Android)                        │
│    - readThread membaca bytes dari InputStream                       │
│    - Mengkonversi ke hex string: "10 08 07 11 0A 0A 04 02 04 01 3F" │
│    - Emit event "onDataReceived" via EventEmitter                    │
│                                                                      │
│    Payload event:                                                    │
│    {                                                                 │
│      address: "00:11:22:33:44:55",                                   │
│      data: "..." (raw string, mungkin rusak/garbled),                │
│      hex: "10 08 07 11 0A 0A 04 02 04 01 3F",  ← hex asli           │
│      timestamp: 1720588800000                                        │
│    }                                                                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ Expo EventEmitter
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. ExpoBluetoothClassicModule.ts (JS bridge)                         │
│    - Menerima event dari native module                               │
│    - Forward ke listener yang terdaftar                              │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ callback
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. BluetoothClassicService.ts (service layer)                        │
│    - Meneruskan event ke semua listener yang terdaftar               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ listener callback
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. useBluetooth.ts (hook)                                            │
│    - Menangani event "onDataReceived"                                │
│    - Memanggil parseMeasurement(data, hex)                           │
│    - logger.packet() mencatat raw + hex untuk debugging              │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ panggil parser
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. parser.ts — parseMeasurement(raw, hex)                            │
│                                                                      │
│    if (hex) → parseBinaryFrame(hex)   ← jalur utama (binary)         │
│    else     → parseTextMeasurement(raw)  ← fallback (ASCII)          │
│                                                                      │
│    parseBinaryFrame():                                               │
│      a. Split hex string → array of bytes                           │
│      b. Validasi preamble (10 08 07) + delimiter (0A 0A)            │
│      c. Cek unit nibble: hanya 1 (µm) atau 2 (mil) yang diterima    │
│      d. Ekstrak substrate dari high nibble byte 3                    │
│      e. Ekstrak BCD value dari byte 6-8 (variable width)            │
│      f. Hitung nilai akhir (Fe/10, NFe conditional)                 │
│      g. Return Measurement object                                    │
│                                                                      │
│    Return: Measurement | null                                        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ Measurement object
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. useBluetoothStore.ts (Zustand)                                    │
│    - addMeasurement() menyimpan ke state:                            │
│      - latestMeasurement (tampilan real-time)                        │
│      - history (semua pengukuran)                                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ re-render
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 8. MeasurementScreen.tsx                                             │
│    - Menampilkan nilai terbaru: "42.4 µm (Fe)"                       │
│    - Menampilkan history dalam list                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## Output Parser: `Measurement` Object

```typescript
interface Measurement {
  substrate: 'Fe' | 'NFe' | null;  // Jenis logam
  value: number;                     // Nilai ketebalan (sudah dihitung)
  unit: 'um' | 'mil' | null;        // Satuan
  raw: string;                       // Hex string asli dari alat
}

interface MeasurementWithTimestamp extends Measurement {
  timestamp: number;                 // Unix timestamp (ms)
}
```

### Contoh Output

| Input HEX | Substrate | Value | Unit | Raw |
|-----------|-----------|-------|------|-----|
| `10 08 07 11 0A 0A 04 02 04 01 3F` | `Fe` | `42.4` | `um` | `10 08 07 11 0A 0A 04 02 04 01 3F` |
| `10 08 07 12 0A 0A 0A 01 06 01 47` | `Fe` | `1.6` | `mil` | `10 08 07 12 0A 0A 0A 01 06 01 47` |
| `10 08 07 21 0A 0A 05 02 00 01 4C` | `NFe` | `52.0` | `um` | `10 08 07 21 0A 0A 05 02 00 01 4C` |
| `10 08 07 11 0A 0A 01 09 09 01 48` | `Fe` | `19.9` | `um` | `10 08 07 11 0A 0A 01 09 09 01 48` |

### Kapan Return `null`?

Parser mengembalikan `null` (tidak diproses) pada kondisi berikut:

| Kondisi | Penyebab |
|---------|----------|
| Frame < 11 byte | Data tidak lengkap |
| Preamble bukan `10 08 07` | Bukan frame CM-8825FN |
| Delimiter bukan `0A 0A` | Frame rusak |
| Unit nibble bukan 1 atau 2 | Status/event frame (misal type=0x21 dengan unit nibble != 1,2) |
| Hex string tidak valid | Parse error |

## Struktur Frame 11-byte

```
Byte:  0    1    2    3    4    5    6    7    8    9   10
     ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
     │ 10 │ 08 │ 07 │ TT │ 0A │ 0A │ XX │ XX │ XX │ 01 │ CS │
     └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
       └─ Preamble ─┘  │  └─ Delimiter ─┘  └─ Payload ─┘  │
                       │                                     │
                  Type byte                             Checksum
                                                    sum(0..9) & 0xFF
```

### Byte 3: Type Byte

```
┌───────────────┬─────────────────┐
│  High nibble  │  Low nibble     │
│  (bit 7-4)    │  (bit 3-0)      │
├───────────────┼─────────────────┤
│ 1 = Fe        │ 1 = µm          │
│ 2 = NFe       │ 2 = mil         │
└───────────────┴─────────────────┘

Contoh:
  0x11 → Fe, µm
  0x12 → Fe, mil
  0x21 → NFe, µm
  0x22 → NFe, mil
```

### Byte 6-8: BCD Value

Nilai ketebalan dikodekan dalam BCD (Binary-Coded Decimal), setiap byte mewakili 1 digit desimal.

**Variable width:**
- Jika byte6 ≤ 9: **3-byte BCD** → `byte6×100 + byte7×10 + byte8`
- Jika byte6 > 9: **2-byte BCD** → `byte7×10 + byte8` (byte6 adalah flag, diabaikan)

**Konversi ke nilai akhir:**

| Substrate | Unit | Rumus |
|-----------|------|-------|
| Fe | µm | BCD / 10 |
| Fe | mil | BCD / 10 |
| NFe | µm | BCD (tanpa dibagi) |
| NFe | mil | BCD / 10 |

### Byte 10: Checksum

```
checksum = (sum of bytes 0 sampai 9) & 0xFF
```

> **Catatan:** Checksum saat ini sudah diverifikasi benar untuk semua contoh packet, tapi **tidak divalidasi** di kode parser (hanya didokumentasikan). Bisa ditambahkan validasi jika diperlukan.

## Fungsi Parser yang Tersedia

### `parseMeasurement(raw: string, hex?: string): Measurement | null`

Entry point utama. Dipanggil dari `useBluetooth` hook. Mencoba binary parser dulu, fallback ke ASCII.

### `parseBinaryFrame(hex: string): Measurement | null`

Parser binary 11-byte frame. Hanya dipanggil internal oleh `parseMeasurement()`.

### `parseTextMeasurement(raw: string): Measurement | null`

Parser teks ASCII (fallback). Hanya dipanggil internal oleh `parseMeasurement()`.

### `parseMeasurementsBuffer(data: string): Measurement[]`

Utility untuk parsing buffer yang berisi banyak baris pengukuran. Split by newline, parse per baris.

## Debugging

Log packet bisa dilihat di console dengan format:

```
[CM8825] PACKET [00:11:22:33:44:55] [2026-07-10T08:00:00.000Z]: "..." | HEX: 10 08 07 11 0A 0A 04 02 04 01 3F
```

Gunakan `logger.setEnabled(true/false)` untuk mengaktifkan/menonaktifkan log.