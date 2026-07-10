# BeriCoating

Aplikasi **coating thickness gauge** berbasis React Native (Expo) untuk membaca data dari alat **CM-8825FN** melalui Bluetooth Classic SPP.

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | Expo SDK 56 + Expo Router |
| UI | React Native 0.85 |
| State Management | Zustand |
| Bluetooth | Custom Expo Module (`expo-bluetooth-classic`) |
| Bahasa | TypeScript 6 |

## Prasyarat

- **Node.js** ≥ 18
- **Android Studio** (untuk build Android)
- **Android SDK** (compileSdk 35, minSdk 24)
- **Expo CLI** (`npx expo`)
- **Perangkat Android** dengan Bluetooth Classic

## Struktur Proyek

```
bericoating/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (Stack navigator)
│   ├── index.tsx                 # Halaman scan & pairing
│   └── measurement.tsx           # Halaman pengukuran
├── src/
│   ├── hooks/
│   │   └── useBluetooth.ts       # Hook Bluetooth (connect, reconnect, data)
│   ├── screens/
│   │   ├── BluetoothScreen.tsx   # UI scan & connect
│   │   └── MeasurementScreen.tsx # UI tampilan pengukuran
│   ├── services/
│   │   └── BluetoothClassic.ts   # Service wrapper Bluetooth
│   ├── store/
│   │   └── useBluetoothStore.ts  # Zustand global state
│   └── utils/
│       ├── logger.ts             # Logger utility
│       └── parser.ts             # Parser protokol CM-8825FN
├── modules/
│   └── expo-bluetooth-classic/   # Custom Expo Module (Bluetooth Classic SPP)
│       ├── src/                  # TypeScript layer
│       └── android/              # Kotlin native layer
├── plugins/
│   ├── withBluetoothClassic.js   # Config plugin
│   └── withSplashScreen.js       # Config plugin
├── docs/
│   └── parser.md                 # Dokumentasi parser
└── app.json                      # Expo config
```

## Menjalankan Aplikasi

### 1. Install dependencies

```bash
cd bericoating
npm install
```

### 2. Prebuild Android

Prebuild diperlukan karena proyek menggunakan custom native module (`expo-bluetooth-classic`):

```bash
npm run prebuild
```

### 3. Jalankan di device Android

```bash
npm run android
```

Atau jalankan Expo dev server dulu lalu buka di device:

```bash
npm start
# lalu tekan 'a' untuk Android
```

### 4. Clean build (jika ada masalah)

```bash
npm run clean
```

## Alur Aplikasi

1. Buka aplikasi → halaman scan Bluetooth
2. Pastikan Bluetooth sudah aktif (ada tombol enable)
3. Pair alat CM-8825FN dari Android Settings terlebih dahulu
4. Tap "Scan" → pilih CM-8825FN dari daftar bonded devices
5. Aplikasi connect via SPP → masuk halaman pengukuran
6. Data dari gauge otomatis diterima dan ditampilkan
7. Jika koneksi putus, aplikasi auto-reconnect (max 10x)

## Custom Module: `expo-bluetooth-classic`

Module ini dibuat khusus karena Expo SDK tidak menyediakan Bluetooth Classic (SPP) — hanya BLE (`expo-bluetooth`). Module ini membungkus Android native `BluetoothAdapter` + `BluetoothSocket` (RFCOMM) dalam format Expo Modules API.

Lihat `modules/expo-bluetooth-classic/` untuk source code lengkap.

## 📡 Protokol Binary CM-8825FN

Alat CM-8825FN mengirim data pengukuran dalam **frame binary 11-byte** melalui Bluetooth SPP secara otomatis — tanpa perlu mengirim command apapun.

### 🧬 Struktur Frame (11 bytes)

```
Byte:  0    1    2    3    4    5    6    7    8    9   10
     ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
     │ 10 │ 08 │ 07 │ TT │ 0A │ 0A │ XX │ XX │ XX │ 01 │ CS │
     └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
       └─── Preamble ──┘  │  └─── Delimiter ──┘  └── Payload ──┘  │
                          │                                         │
                     Type Byte                                  Checksum
                                                           sum(0..9) & 0xFF
```

| Byte | Field | Nilai | Keterangan |
|------|-------|-------|------------|
| 0–2 | **Preamble** | `10 08 07` | Sync marker, selalu tetap |
| 3 | **Type** | `TT` | High nibble = substrate, Low nibble = unit |
| 4–5 | **Delimiter** | `0A 0A` | Pemisah header-payload, selalu tetap |
| 6–8 | **Payload** | `XX XX XX` | BCD value, lebar 2 atau 3 byte |
| 9 | **Reserved** | `01` | Selalu `0x01` |
| 10 | **Checksum** | `CS` | `(sum byte 0..9) & 0xFF` |

### 🎯 Type Byte — Byte 3

```
  ┌──────────────────────────────────┐
  │  High Nibble   │  Low Nibble     │
  │  (bit 7–4)     │  (bit 3–0)      │
  ├────────────────┼─────────────────┤
  │  1 = Fe   🟤   │  1 = µm   📏    │
  │  2 = NFe  🔵   │  2 = mil  📐    │
  └────────────────┴─────────────────┘
```

| Type Hex | Substrate | Unit | Contoh |
|----------|-----------|------|--------|
| `0x11` | Fe | µm | Pengukuran di baja, satuan mikron |
| `0x12` | Fe | mil | Pengukuran di baja, satuan mils |
| `0x21` | NFe | µm | Pengukuran di aluminium, satuan mikron |
| `0x22` | NFe | mil | Pengukuran di aluminium, satuan mils |

> Hanya frame dengan **low nibble 1 atau 2** yang di-parse. Frame dengan low nibble lain (misal `0x21` dengan unit nibble ≠ 1,2) adalah **status/event** dan diabaikan.

### 🔢 Payload — BCD Value (byte 6–8)

Nilai ketebalan dikodekan dalam **BCD (Binary-Coded Decimal)** dengan lebar variabel:

| Kondisi | Lebar | Rumus |
|---------|-------|-------|
| `byte6 ≤ 9` | **3-byte BCD** | `byte6×100 + byte7×10 + byte8` |
| `byte6 > 9` | **2-byte BCD** | `byte7×10 + byte8` (byte6 = flag, diabaikan) |

**Konversi ke nilai akhir:**

| Substrate | Unit | Rumus |
|-----------|------|-------|
| Fe | µm | `BCD ÷ 10` |
| Fe | mil | `BCD ÷ 10` |
| NFe | µm | `BCD` (tanpa dibagi) |
| NFe | mil | `BCD ÷ 10` |

### ✅ Contoh Terverifikasi

| Frame HEX | Type | BCD | Kalkulasi | Hasil |
|-----------|------|-----|-----------|-------|
| `10 08 07 11 0A 0A 04 02 04 01 3F` | `0x11` | `424` | `424 ÷ 10` | **42.4 µm** (Fe) |
| `10 08 07 12 0A 0A 0A 01 06 01 47` | `0x12` | `16` | `16 ÷ 10` | **1.6 mil** (Fe) |
| `10 08 07 12 0A 0A 02 07 00 01 3F` | `0x12` | `270` | `270 ÷ 10` | **27.0 mil** (Fe) |
| `10 08 07 21 0A 0A 05 02 00 01 4C` | `0x21` | `520` | `520 ÷ 10` | **52.0 µm** (NFe) |
| `10 08 07 11 0A 0A 01 09 09 01 48` | `0x11` | `199` | `199 ÷ 10` | **19.9 µm** (Fe) |

### 📦 Output Parser

```typescript
interface Measurement {
  substrate: 'Fe' | 'NFe' | null;  // Jenis logam
  value: number;                     // Nilai ketebalan
  unit: 'um' | 'mil' | null;        // Satuan
  raw: string;                       // Hex string asli
}
```

### 📝 ASCII Fallback

Jika gauge mengirim data dalam format teks (jarang), parser akan fallback ke:

| Input | Output |
|-------|--------|
| `"245.5"` | `{ value: 245.5, substrate: null, unit: null }` |
| `"Fe,245.5,um"` | `{ substrate: "Fe", value: 245.5, unit: "um" }` |
| `"NFe,87,mil"` | `{ substrate: "NFe", value: 87, unit: "mil" }` |

> 📖 Dokumentasi lengkap alur data dari paket Bluetooth → parser → UI: [`docs/parser.md`](docs/parser.md)