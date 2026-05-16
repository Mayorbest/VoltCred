#include <WiFi.h>
#include <FirebaseESP32.h>

// ==========================================
// 1. CREDENTIALS & IDENTIFICATION
// ==========================================
#define WIFI_SSID "Redmi 14C"
#define WIFI_PASSWORD "Skippo23"

#define FIREBASE_HOST "https://voltcred-5d532-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RyWzupXfhhLoxBibdBQsTXV0G5vEZsSUHyHRTSyK"

String deviceId = "ESP32_A1B2"; // Must match your web dashboard!

// ==========================================
// 2. HARDWARE WIRING PINS
// ==========================================
#define RELAY_PIN 4
#define VOLTAGE_PIN 5 
#define CURRENT_PIN 6 

// ==========================================
// 3. RELAY LOGIC FIX (Active Low Configuration)
// ==========================================
// Most 5V relays turn ON when the signal is LOW. 
// If your specific relay operates normally (HIGH = ON), just swap these two words!
#define RELAY_ON LOW
#define RELAY_OFF HIGH

// ==========================================
// 4. CALIBRATION MULTIPLIERS
// ==========================================
float VOLTAGE_CALIBRATION = 0.55; 
float CURRENT_CALIBRATION = 0.0264; 

// ==========================================
// 5. GLOBAL OBJECTS
// ==========================================
FirebaseData fbData;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastTelemetryUpdate = 0;

void setup() {
  Serial.begin(115200);
  
  // 1. Setup Relay Output
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ON); // Default to ON so the vendor starts with power

  // 2. Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  
  // 3. Connect to Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase Connected!");
}

// ==========================================
// 6. CUSTOM AC SAMPLING FUNCTIONS
// ==========================================
float readACVoltage() {
  uint32_t period = 40; 
  uint32_t t_start = millis();
  int max_val = 0;
  int min_val = 4095; 

  while(millis() - t_start < period) {
    int val = analogRead(VOLTAGE_PIN);
    if(val > max_val) max_val = val;
    if(val < min_val) min_val = val;
  }
  
  float peakToPeak = max_val - min_val;
  return peakToPeak * VOLTAGE_CALIBRATION; 
}

float readACCurrent() {
  uint32_t period = 40; 
  uint32_t t_start = millis();
  int max_val = 0;
  int min_val = 4095; 

  while(millis() - t_start < period) {
    int val = analogRead(CURRENT_PIN);
    if(val > max_val) max_val = val;
    if(val < min_val) min_val = val;
  }
  
  float peakToPeak = max_val - min_val;
  float rmsCurrent = peakToPeak * CURRENT_CALIBRATION;
  
  if (rmsCurrent < 0.1) rmsCurrent = 0.0; 
  
  return rmsCurrent;
}

void loop() {
  // =========================================================
  // TASK A: THE KILL SWITCH (Fixed Logic)
  // =========================================================
  if (Firebase.getInt(fbData, "/devices/" + deviceId + "/relayState")) {
    int state = fbData.intData();
    
    // Web Dashboard says 1 (Active) -> Turn Relay ON
    if (state == 1) {
      digitalWrite(RELAY_PIN, RELAY_ON); 
    } 
    // Web Dashboard says 0 (Defaulted) -> Cut Power
    else {
      digitalWrite(RELAY_PIN, RELAY_OFF); 
    }
  }

  // =========================================================
  // TASK B: TELEMETRY CALCULATION & CLOUD SYNC
  // =========================================================
  if (millis() - lastTelemetryUpdate > 2000) {
    lastTelemetryUpdate = millis();

    // 1. Get raw sensor readings
    float voltage = readACVoltage();
    float current = readACCurrent();

    // ==========================================
    // THE NOISE GATE (Forces ghost data to zero)
    // ==========================================
    // If the AC is cut, any reading under 50 Volts is pure static.
    if (voltage < 50.0) {
        voltage = 0.0;
    }
    
    // Any reading under 0.15 Amps is just idle sensor noise.
    if (current < 0.15) {
        current = 0.0;
    }

    // 2. The Physics: Power = Voltage * Current
    float power = voltage * current;

    // 3. Push to Web Dashboard
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/voltage", voltage);
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/current", current);
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/power", power);
    
    Serial.println("V: " + String(voltage) + " | A: " + String(current) + " | W: " + String(power));
  }
}