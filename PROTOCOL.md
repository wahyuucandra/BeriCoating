# CM-8825FN Protocol Reverse Engineering

## Captured Packets (11 bytes fixed)

| # | HEX | Type | Type Byte | Payload | Checksum | Checksum ✓ |
|---|-----|------|-----------|---------|----------|------------|
| 1 | `10 08 07 11 0A 0A 01 09 09 01 48` | 11 | data | `01 09 09 01` | `48` | ✅ |
| 2 | `10 08 07 11 0A 0A 01 05 07 01 42` | 11 | data | `01 05 07 01` | `42` | ✅ |
| 3 | `10 08 07 11 0A 0A 02 09 04 01 44` | 11 | data | `02 09 04 01` | `44` | ✅ |
| 4 | `10 08 07 21 0A 0A 05 02 00 01 4C` | 21 | event | `05 02 00 01` | `4C` | ✅ |

## Frame Structure

```
Byte:  0    1    2    3    4    5    6    7    8    9    10
     ┌────────────────────────────────────────────────────────┐
     │ 10 │ 08 │ 07 │ TT │ 0A │ 0A │ XX │ XX │ XX │ UU │ CS │
     └────────────────────────────────────────────────────────┘
       │         │     │          │    │              │    │
       Preamble  │  Type  Delimiter  Payload (4B)     Unit Checksum
                 │   11=data, 21=event                  (sum(0-9) & 0xFF)
```

## Leading Hypothesis: BCD Value

Payload `01 09 09 01` = 109.9 in some unit → **109.9 µm**
Payload `01 05 07 01` = 105.7 → **105.7 µm**
Payload `02 09 04 01` = 209.4 → **209.4 µm**
Payload `05 02 00 01` = 520.0 → **520.0 µm** (type 21 = event, not measurement)

**Byte 9 = 0x01 → possibly unit = µm**

---

## Reverse-Engineering Steps

### Step 1: Trigger commands
Send these from the command panel:
- `D` or hex `44` — start continuous measurement
- `M` or hex `4D` — measure
- `S` or hex `53` — single reading
- `R` or hex `52` — read
- `0D 0A` — CRLF (trigger response)
- `10 08 07` — echo preamble

### Step 2: Measure known objects
Press probe on:
- **Zero plate** → expect 0.0 µm
- **Standard foil** (50/100/250 µm) → compare hex payload
- **Bare metal** → expect 0.0 µm

### Step 3: Switch modes
Send `F` (Fe) and `N` (NFe) commands, observe byte changes.

### Step 4: Switch units
Change gauge unit (µm ↔ mils), observe payload differences.

### Step 5: Verify checksum
`sum(bytes[0..9]) & 0xFF == bytes[10]`

---

## Notes

- The gauge sends packets automatically (no command needed)
- `!` sometimes appears in the data — likely a probe-lift/status event
- `H`, `B`, `D` are ASCII artifacts from UTF-8 decoding of binary — ignore them
- The hex bytes from `startReadingLoop()` are the ground truth