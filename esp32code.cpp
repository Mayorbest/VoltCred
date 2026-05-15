#include <WiFi.h>
#include <FirebaseESP32.h>

// ==========================================
// 1. CREDENTIALS & IDENTIFICATION
// ==========================================
#define WIFI_SSID "Mayowa's Galaxy A04S"
#define WIFI_PASSWORD "aaaaaaaa"

// From Firebase Console -> Project Settings -> Service Accounts -> Database Secrets
#define FIREBASE_HOST "https://voltcred-5d532-default-rtdb.firebaseio.com" 
#define FIREBASE_AUTH "AIzaSyBjlCkS54cw2C2L0K3k73IRaIxlg4TNDXY"

String deviceId = "ESP32_A1B2"; // Must match your dashboard!

// ==========================================
// 2. HARDWARE WIRING PINS
// ==========================================
#define RELAY_PIN 4
#define VOLTAGE_PIN 34 // Analog pin for ZMPT101B
#define CURRENT_PIN 35 // Analog pin for ACS712

// ==========================================
// 3. CALIBRATION MULTIPLIERS (The Hackathon Cheat Code)
// ==========================================
// Adjust these decimals until your dashboard matches your test load
float VOLTAGE_CALIBRATION = 0.55; 
float CURRENT_CALIBRATION = 0.0264; 

// ==========================================
// 4. GLOBAL OBJECTS
// ==========================================
FirebaseData fbData;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastTelemetryUpdate = 0;

void setup() {
  Serial.begin(115200);
  
  // 1. Setup Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Default: Power ON

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
// 5. CUSTOM AC SAMPLING FUNCTIONS
// ==========================================
float readACVoltage() {
  uint32_t period = 40; // 40ms captures exactly two 50Hz cycles
  uint32_t t_start = millis();
  int max_val = 0;
  int min_val = 4095; // Max resolution of ESP32 ADC

  while(millis() - t_start < period) {
    int val = analogRead(VOLTAGE_PIN);
    if(val > max_val) max_val = val;
    if(val < min_val) min_val = val;
  }
  
  float peakToPeak = max_val - min_val;
  return peakToPeak * VOLTAGE_CALIBRATION; // Convert raw wave to RMS Volts
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
  
  // Filter out microscopic electrical noise when nothing is plugged in
  if (rmsCurrent < 0.1) rmsCurrent = 0.0; 
  
  return rmsCurrent;
}

void loop() {
  // =========================================================
  // TASK A: THE KILL SWITCH
  // =========================================================
  if (Firebase.getInt(fbData, "/devices/" + deviceId + "/relayState")) {
    int state = fbData.intData();
    if (state == 1) {
      digitalWrite(RELAY_PIN, HIGH); 
    } else {
      digitalWrite(RELAY_PIN, LOW); 
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

    // 2. The Physics: Power = Voltage * Current
    float power = voltage * current;

    // 3. Push to Web Dashboard
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/voltage", voltage);
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/current", current);
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/power", power);
    
    Serial.println("V: " + String(voltage) + " | A: " + String(current) + " | W: " + String(power));
  }
}