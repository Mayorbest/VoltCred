#include <WiFi.h>
#include <FirebaseESP32.h>
#include <PZEM004Tv30.h>

// ==========================================
// 1. YOUR NETWORK & CLOUD CREDENTIALS
// ==========================================
#define WIFI_SSID "Mayowa's galaxy A04s"
#define WIFI_PASSWORD "aaaaaaaa"

// Get these from Firebase Console -> Project Settings -> Service Accounts -> Database Secrets
#define FIREBASE_HOST "https://voltcred-5d532-default-rtdb.firebaseio.com" 
#define FIREBASE_AUTH "AIzaSyBjlCkS54cw2C2L0K3k73IRaIxlg4TNDXY"

// ==========================================
// 2. HARDWARE WIRING PINS
// ==========================================
#define PZEM_RX 16   // Connect to PZEM TX
#define PZEM_TX 17   // Connect to PZEM RX
#define RELAY_PIN 4  // Connect to the Relay Signal pin

// ==========================================
// 3. GLOBAL OBJECTS & VARIABLES
// ==========================================
PZEM004Tv30 pzem(Serial2, PZEM_RX, PZEM_TX);
FirebaseData fbData;
FirebaseAuth auth;
FirebaseConfig config;

// CRITICAL: This must exactly match the ID in your web dashboard!
String deviceId = "ESP32_A1B2"; 
unsigned long lastTelemetryUpdate = 0;

void setup() {
  Serial.begin(115200);
  
  // 1. Setup the Hardware Kill Switch (Relay)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Usually, HIGH keeps the relay ON (power flowing)

  // 2. Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  
  // 3. Connect to Firebase Realtime Database
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase Connected!");
}

void loop() {
  // =========================================================
  // TASK A: LISTEN FOR THE KILL SWITCH (Runs instantly)
  // =========================================================
  if (Firebase.getInt(fbData, "/devices/" + deviceId + "/relayState")) {
    int state = fbData.intData();
    
    // If Admin dashboard says 1, keep power ON. If 0, CUT POWER.
    if (state == 1) {
      digitalWrite(RELAY_PIN, HIGH); 
    } else {
      digitalWrite(RELAY_PIN, LOW); 
      Serial.println("⚠️ KILL SWITCH ACTIVATED: Power Cut!");
    }
  }

  // =========================================================
  // TASK B: SEND LIVE TELEMETRY (Runs every 2 seconds)
  // =========================================================
  if (millis() - lastTelemetryUpdate > 2000) {
    lastTelemetryUpdate = millis();

    // 1. Read the PZEM Sensor
    float voltage = pzem.voltage();
    float current = pzem.current();
    float power = pzem.power();

    // 2. Error handling (if the sensor wire unplugs)
    if(isnan(voltage)) {
       voltage = 0.0; 
       current = 0.0; 
       power = 0.0;
       Serial.println("Error reading sensor");
    }

    // 3. Push data to Firebase (this instantly updates your Admin.html!)
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/voltage", voltage);
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/current", current);
    Firebase.setFloat(fbData, "/devices/" + deviceId + "/liveData/power", power);
    
    Serial.println("Telemetry sent: " + String(power) + "W");
  }
}