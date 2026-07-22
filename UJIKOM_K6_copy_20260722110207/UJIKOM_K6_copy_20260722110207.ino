#include <WiFi.h>
#include <WebServer.h>
#include <ThingSpeak.h>
#include <LittleFS.h>
#include <DHT.h> // Tambahkan Library DHT

// ================= KONFIGURASI =================
const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";

unsigned long myChannelNumber = 3433062;          
const char* myWriteAPIKey = "B7F4IWU7AHLWAPCI"; 
// ===============================================

// Konfigurasi Pin Sensor & Aktuator
#define DHTPIN 14       // Pin Data DHT21 terhubung ke Pin 14 Wemos32
#define DHTTYPE DHT21   // Jenis Sensor (DHT21 / AM2301)
const int pinSoil = 32; // Pin Analog untuk Sensor Kelembaban Tanah

const int pinPompa = 26; // Aktuator 1 (Pompa)
const int pinKipas = 27; // Aktuator 2 (Kipas)

DHT dht(DHTPIN, DHTTYPE);
WiFiClient client;
WebServer server(80);

unsigned long lastTime = 0;
unsigned long timerDelay = 15000; // Kirim tiap 15 detik

void setup() {
  Serial.begin(115200);
  
  // Setup Pin Aktuator
  pinMode(pinPompa, OUTPUT);
  pinMode(pinKipas, OUTPUT);
  digitalWrite(pinPompa, LOW); // Awal mati
  digitalWrite(pinKipas, LOW); // Awal mati

  // Mulai Sensor DHT
  dht.begin();

  // Mount LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("Gagal Mount LittleFS!");
    return;
  }

  // Hubungkan ke WiFi
  WiFi.begin(ssid, password);
  Serial.print("Menghubungkan WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nTerhubung! Buka IP ini di Browser:");
  Serial.println(WiFi.localIP()); 

  ThingSpeak.begin(client);

  // Setup Routing WebServer LittleFS
  server.serveStatic("/", LittleFS, "/");

  // Endpoint Kendali Aktuator
  server.on("/actuator", HTTP_GET, []() {
    if (server.hasArg("id") && server.hasArg("state")) {
      String id = server.arg("id");
      String state = server.arg("state");
      
      int pin = (id == "1") ? pinPompa : pinKipas;
      int val = (state == "1") ? HIGH : LOW;
      
      digitalWrite(pin, val);
      
      server.send(200, "text/plain", "OK");
      Serial.println("Perintah Aktuator: " + id + " -> " + state);
    } else {
      server.send(400, "text/plain", "Bad Request");
    }
  });

  server.begin();
}

void loop() {
  server.handleClient(); 

  // Timer kirim ke ThingSpeak
  if ((millis() - lastTime) > timerDelay) {
    
    // 1. Baca DHT21
    float suhu = dht.readTemperature();
    float kelUdara = dht.readHumidity();

    // 2. Baca Sensor Kelembaban Tanah
    // Nilai analog ESP32 adalah 0 - 4095. 
    // Kita petakan (map) menjadi persen (0-100%).
    // Catatan: Kalibrasi angka 4095 (Kering) dan 0 (Basah) sesuai sensor riil Anda.
    int nilaiAnalogTanah = analogRead(pinSoil);
    float kelTanah = map(nilaiAnalogTanah, 4095, 0, 0, 100); 

    // Validasi pembacaan DHT
    if (isnan(suhu) || isnan(kelUdara)) {
      Serial.println("Gagal membaca sensor DHT!");
    } else {
      Serial.printf("Suhu: %.2f C | Udara: %.2f %% | Tanah: %.2f %%\n", suhu, kelUdara, kelTanah);

      // Set Data untuk ThingSpeak
      ThingSpeak.setField(1, suhu);
      ThingSpeak.setField(2, kelUdara);
      ThingSpeak.setField(3, kelTanah);

      // Kirim Data
      int x = ThingSpeak.writeFields(myChannelNumber, myWriteAPIKey);
      if (x == 200) {
        Serial.println("Data sukses dikirim ke ThingSpeak.");
      } else {
        Serial.println("Gagal! Kode HTTP: " + String(x));
      }
    }
    
    lastTime = millis();
  }
}