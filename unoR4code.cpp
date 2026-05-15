#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <PZEM004Tv30.h>

// ==========================================
// 1. CREDENTIALS
// ==========================================
char ssid[] = "YOUR_WIFI_NAME";
char pass[] = "YOUR_WIFI_PASSWORD";

// Firebase RTDB URL (Remove 'https://' and trailing slashes)
// Example: "your-voltcred-app.firebaseio.com"
const char serverAddress[] = "https://voltcred-5d532-default-rtdb.firebaseio.com";
const int port = 443; // Standard HTTPS port

// Your Firebase Database Secret
String authSecret = "AIzaSyBjlCkS54cw2C2L0K3k73IRaIxlg4TNDXY";
String deviceId = "ESP32_A1B2"; // Keep the same ID for the dashboard

// ==========================================
// 2. HARDWARE WIRING PINS (Uno R4)
// ==========================================
// The Uno R4 has a dedicated hardware serial (Serial1) on Pins 0 and 1
PZEM004Tv30 pzem(Serial1, 0, 1); 
const int RELAY_PIN = 4;

// ==========================================
// 3. GLOBAL OBJECTS
// ==========================================
WiFiSSLClient wifiClient;
HttpClient client = HttpClient(wifiClient, serverAddress, port);
unsigned long lastTelemetryUpdate = 0;

void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Default: Power ON

  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, pass);
    delay(5000);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void loop() {
  // =========================================================
  // TASK A: READ THE SENSOR
  // =========================================================
  if (millis() - lastTelemetryUpdate > 2000) {
    lastTelemetryUpdate = millis();

    float voltage = pzem.voltage();
    float current = pzem.current();
    float power = pzem.power();

    if(isnan(voltage)) {
       voltage = 0.0; current = 0.0; power = 0.0;
    }

    Serial.println("Power: " + String(power) + "W");

    // =========================================================
    // TASK B: SEND TELEMETRY TO FIREBASE (HTTP PATCH)
    // =========================================================
    // We build a JSON string manually to update the database
    String jsonPayload = "{\"voltage\":" + String(voltage) + ", \"current\":" + String(current) + ", \"power\":" + String(power) + "}";
    String path = "/devices/" + deviceId + "/liveData.json?auth=" + authSecret;

    client.patch(path, "application/json", jsonPayload);
    int statusCode = client.responseStatusCode();
    String response = client.responseBody(); // Clear the buffer
    
    // =========================================================
    // TASK C: CHECK THE KILL SWITCH (HTTP GET)
    // =========================================================
    String getPath = "/devices/" + deviceId + "/relayState.json?auth=" + authSecret;
    client.get(getPath);
    
    int getStatus = client.responseStatusCode();
    String getState = client.responseBody();
    
    // Clean up the string to extract the number (0 or 1)
    getState.trim(); 
    
    if (getState == "1") {
      digitalWrite(RELAY_PIN, HIGH);
    } else if (getState == "0") {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("⚠️ KILL SWITCH ACTIVATED!");
    }
  }
}