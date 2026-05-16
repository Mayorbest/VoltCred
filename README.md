# VoltCred ⚡
**Hardware-Backed Microfinance Trust Engine**
*Squad Hackathon 3.0 — "Proof of Life" Challenge*

---

## The Problem

Microfinance institutions in Nigeria's informal sector face a trust crisis.
Traditional credit scores don't exist for market traders. Lenders have no way to verify whether a business is actively operating or just a paper shell — leading to high default rates, rampant fraud, and millions of real businesses locked out of working capital.

## The Solution

VoltCred physically verifies that a business exists and is operating — using IoT hardware.

By deploying a smart energy node (ESP32 + PZEM-004T sensor) to the vendor's equipment (sewing machine, refrigerator, barbing clippers), VoltCred continuously monitors real-time power consumption. A statistical AI engine — combining Z-score analysis, Coefficient of Variation scoring, and an Isolation Forest anomaly detector — analyses the power telemetry to distinguish a genuine operating machine from a dummy load used to fake activity.

If the Trust Score crosses the 80/100 threshold, the Admin dashboard can instantly disburse working capital to the vendor's account via the **Squad 3.0 Payout API**. If a vendor defaults, an admin-triggered Kill Switch remotely cuts power to their equipment via the relay.

**"Proof of Life" is not a document. It's a live wattage reading."**

---

## How It Works

```
[ESP32 + Sensor] → Firebase RTDB → [AI Engine / trace.js] → Trust Score
                                                                   ↓
                                              [Admin Dashboard] → Squad Payout API → Vendor Account
```

1. **Hardware Telemetry** — The ESP32 pushes Voltage, Current, and Wattage to Firebase every 2 seconds.
2. **AI Anomaly Detection** — `trace.js` runs a 4-signal ensemble model on the live data stream:
   - **Z-score outlier detection** — flags power readings that deviate unexpectedly from the rolling mean.
   - **Coefficient of Variation (CV)** — real machines fluctuate 5–40%; dummy resistive loads have CV < 1%.
   - **Isolation Forest** — anomalies are isolated in fewer random partitions → shorter path length → higher anomaly score.
   - **Trend analysis** — sudden load collapse after sustained activity is a fraud-avoidance signal.
3. **Smart Disbursal** — An eligible Trust Score unlocks the Squad Transfer API call via a Netlify serverless function. The AI-approved loan ceiling is enforced before every disbursal.
4. **Repayment Tracking** — Vendors view their active loan and daily targets via the Borrower Portal.
5. **Hardware Kill Switch** — Admin can remotely cut power to a defaulting vendor's equipment via a Firebase relay command.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (Grid, Glassmorphism), ES6 Modules |
| Real-time DB | Firebase Realtime Database |
| Backend / API | Node.js via Netlify Serverless Functions |
| Financial API | Squad 3.0 Sandbox — Payouts/Transfers |
| AI Engine | Custom JS: Z-score + CV + Isolation Forest + Trend |
| Hardware (Option A) | ESP32 + PZEM-004T AC Energy Sensor + 5V Relay |
| Hardware (Option B) | Arduino Uno R4 WiFi + PZEM-004T + 5V Relay |

---

## Project Structure

```
VoltCred/
├── index.html / admin.html / borrower.html   # Frontend pages
├── auth.js          # Firebase init — reads credentials from public/env.js
├── trace.js         # AI Trust Engine (anomaly detection + scoring)
├── task.js          # Main dashboard logic — binds UI to Firebase + AI
├── style.css / main.css
├── esp32code.cpp    # Arduino sketch for ESP32 (Option A hardware)
├── unoR4code.cpp    # Arduino sketch for Arduino Uno R4 (Option B)
├── database.json    # Firebase RTDB seed data (import via Firebase Console)
├── public/
│   └── env.js       # Runtime config injector (gitignored — see setup below)
└── netlify/
    └── function/
        └── squadPayout.js   # Serverless Squad API proxy (keeps secret key safe)
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) — `npm install -g netlify-cli`
- A [Firebase](https://firebase.google.com/) project with Realtime Database enabled
- A [Squad](https://squadco.com/) sandbox account

### Step 1 — Clone the repository

```bash
git clone https://github.com/Mayorbest/VoltCred.git
cd VoltCred
```

### Step 2 — Configure environment variables

**Never hardcode credentials in source files.** VoltCred uses two separate credential stores:

#### A. Netlify Environment Variables (for the serverless Squad function)

In your Netlify dashboard → Site settings → Environment variables, add:

| Variable | Value |
|---|---|
| `SQUAD_SECRET_KEY` | Your Squad sandbox secret key |

#### B. Firebase config for the browser (via `public/env.js`)

Copy the example file and fill in your Firebase project values:

```bash
cp public/env.example.js public/env.js
```

Open `public/env.js` and replace each placeholder with your real values from the [Firebase Console](https://console.firebase.google.com/) → Project Settings → General → Your apps:

```js
window.__env = {
  FIREBASE_API_KEY:             "AIzaSyBjlCkS54cw2C2L0K3k73IRaIxlg4TNDXY",
  FIREBASE_AUTH_DOMAIN:         "https://voltcred-5d532-default-rtdb.firebaseio.com",
  FIREBASE_DATABASE_URL:        "voltcred-5d532.firebaseapp.com",
  FIREBASE_PROJECT_ID:          "voltcred-5d532",
  FIREBASE_STORAGE_BUCKET:      "voltcred-5d532.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID: "269263948415",
  FIREBASE_APP_ID:              "1:269263948415:web:ec844cb6a31ee575b08d4a",
  FIREBASE_MEASUREMENT_ID:      "G-VGLGYK3MXM",
};
```

> `public/env.js` is listed in `.gitignore` and will never be committed.

### Step 3 — Seed the Firebase database

1. Go to [Firebase Console](https://console.firebase.google.com/) → Realtime Database → your project.
2. Click the three-dot menu → **Import JSON**.
3. Upload `database.json` from this repo.

### Step 4 — Set Firebase security rules

In Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    ".read":  "auth != null",
    ".write": "auth != null"
  }
}
```

For hackathon demo purposes only, you may temporarily use open rules — but **switch back to authenticated rules before any production use**.

### Step 5 — Run locally

```bash
netlify dev
```

This starts the frontend and the Netlify serverless function on `http://localhost:8888`.  
Open `admin.html` to see the admin dashboard and `borrower.html` for the borrower portal.

---

## Hardware Setup

Two firmware options are provided. Use whichever board you have available.

### Option A — ESP32 + Analog Sensors

**File:** `esp32code.cpp`  
**Board:** ESP32 Dev Module  
**Library required:** [FirebaseESP32](https://github.com/mobizt/Firebase-ESP32)

**Wiring:**

| Component | ESP32 Pin |
|---|---|
| ZMPT101B (Voltage) | GPIO 34 (Analog) |
| ACS712 (Current) | GPIO 35 (Analog) |
| 5V Relay IN | GPIO 4 |

**Steps:**
1. Open `esp32code.cpp` in Arduino IDE.
2. Fill in `WIFI_SSID`, `WIFI_PASSWORD`, `FIREBASE_HOST`, and `FIREBASE_AUTH` (your Firebase Database Secret — found in Project Settings → Service Accounts → Database Secrets).
3. Flash to the board. Open Serial Monitor at 115200 baud to verify readings.

> Calibrate `VOLTAGE_CALIBRATION` and `CURRENT_CALIBRATION` by comparing the Serial output against a known reference load (e.g. a 60W light bulb) until the readings match.

### Option B — Arduino Uno R4 WiFi + PZEM-004T

**File:** `unoR4code.cpp`  
**Board:** Arduino Uno R4 WiFi  
**Libraries required:** `WiFiS3`, `ArduinoHttpClient`, `PZEM004Tv30`

**Wiring:**

| Component | Uno R4 Pin |
|---|---|
| PZEM-004T TX | Pin 0 (Serial1 RX) |
| PZEM-004T RX | Pin 1 (Serial1 TX) |
| 5V Relay IN | Pin 4 |

**Steps:**
1. Open `unoR4code.cpp` in Arduino IDE.
2. Fill in `ssid`, `pass`, `serverAddress` (your Firebase RTDB URL), and `authSecret`.
3. Flash to the board. The PZEM-004T provides precision AC measurements out of the box — no calibration needed.

---

## Demo Without Hardware

To run a live demo without physical hardware, open the Firebase Console → Realtime Database and manually update values under `devices/ESP32_A1B2/liveData`. The dashboard updates in real time. Simulate a flat-line dummy load by setting power to a fixed value (e.g. `100.0`) and watching the AI flag it as anomalous within ~20 seconds.

---

## Squad API Integration

The Squad Payout API is called from `netlify/function/squadPayout.js` — a serverless backend function that keeps your secret key off the frontend.

**Endpoint used:** `POST https://sandbox-api-d.squadco.com/payout/transfer`

**Flow:**
1. Admin dashboard validates the loan amount against the AI-approved ceiling.
2. A `POST` request is sent to `/.netlify/functions/squadPayout` with `{ amount, accountNumber, bankCode }`.
3. The serverless function injects the `SQUAD_SECRET_KEY` environment variable and forwards the call to Squad.
4. On success, the Firebase `financials.activeLoan` node is updated and the borrower portal reflects the new balance immediately.

---

## Four Pillars Addressed

| Pillar | How VoltCred addresses it |
|---|---|
| **AI Automation** | 4-signal ensemble anomaly model (Z-score + CV + Isolation Forest + Trend) automates trust decisions end-to-end |
| **Use of Data** | Real-time hardware telemetry drives predictive scoring; score improves with sustained legitimate usage |
| **Squad APIs** | Squad Payout API is the core disbursement mechanism — not a superficial integration |
| **Financial Innovation** | First IoT-backed credit scoring system for Nigeria's informal sector |

---

## Team

Built for Squad Hackathon 3.0 by Team SPECTRUM STAR.

---

## License

MIT
