// ================= KONFIGURASI =================
const ESP_IP = "http://192.168.1.100"; // GANTI DENGAN IP ESP32 ANDA
const maxDataPoints = 15; // Jumlah titik data maksimum di grafik
// ===============================================

let timeLabels = [];

// --- Fungsi Pembuat Grafik Base ---
function createChart(ctx, label, color, bgColor) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: bgColor,
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Membuat garis grafik sedikit melengkung (smooth)
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: false } // Agar skala Y otomatis menyesuaikan angka
            },
            animation: { duration: 0 } // Mematikan animasi agar tidak berkedip saat update cepat
        }
    });
}

// Inisialisasi 3 Grafik dengan warna tema Agroteknologi
// Suhu: Merah/Oranye hangat, Udara: Biru segar, Tanah: Coklat tanah
const chartSuhu = createChart(document.getElementById('chartSuhu').getContext('2d'), 'Suhu (°C)', '#e53935', 'rgba(229, 57, 53, 0.1)');
const chartHum = createChart(document.getElementById('chartHum').getContext('2d'), 'Kel. Udara (%)', '#1e88e5', 'rgba(30, 136, 229, 0.1)');
const chartSoil = createChart(document.getElementById('chartSoil').getContext('2d'), 'Kel. Tanah (%)', '#8d6e63', 'rgba(141, 110, 99, 0.1)');


// --- Fungsi Menarik Data JSON dari ESP32 ---
function fetchSensorData() {
    fetch(`${ESP_IP}/data`)
        .then(response => response.json())
        .then(data => {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            // 1. Update Angka Teks di atas Grafik
            document.getElementById('txtSuhu').innerText = data.suhu;
            document.getElementById('txtHum').innerText = data.kelembapanUdara;
            document.getElementById('txtSoil').innerText = data.kelembapanTanah;

            // 2. Efek Sliding Window (Hapus data lama jika melebihi batas)
            if (timeLabels.length >= maxDataPoints) {
                timeLabels.shift();
                chartSuhu.data.datasets[0].data.shift();
                chartHum.data.datasets[0].data.shift();
                chartSoil.data.datasets[0].data.shift();
            }

            // 3. Masukkan Data Baru ke Grafik
            timeLabels.push(timeString);
            chartSuhu.data.datasets[0].data.push(data.suhu);
            chartHum.data.datasets[0].data.push(data.kelembapanUdara);
            chartSoil.data.datasets[0].data.push(data.kelembapanTanah);

            // 4. Render Ulang Grafik
            chartSuhu.update();
            chartHum.update();
            chartSoil.update();
        })
        .catch(error => console.log("Menunggu koneksi dari ESP32..."));
}

// Tarik data secara terus menerus setiap 2 detik
setInterval(fetchSensorData, 2000);
fetchSensorData();


// --- Fungsi Kontrol Aktuator ---
let fanState = false;
let pumpState = false;

function toggleFan() {
    fanState = !fanState;
    const stateParam = fanState ? 1 : 0;
    
    fetch(`${ESP_IP}/fan?state=${stateParam}`)
        .then(response => {
            if (response.ok) {
                const btn = document.getElementById('btnFan');
                const status = document.getElementById('statusFan');
                
                if (fanState) {
                    btn.textContent = "Matikan Kipas";
                    btn.className = "btn btn-on";
                    status.textContent = "Sistem Menyala (ON)";
                } else {
                    btn.textContent = "Nyalakan Kipas";
                    btn.className = "btn btn-off";
                    status.textContent = "Sistem Mati (OFF)";
                }
            }
        })
        .catch(error => alert("Gagal menghubungi ESP32! Periksa koneksi WiFi."));
}

function togglePump() {
    pumpState = !pumpState;
    const stateParam = pumpState ? 1 : 0;
    
    fetch(`${ESP_IP}/pump?state=${stateParam}`)
        .then(response => {
            if (response.ok) {
                const btn = document.getElementById('btnPump');
                const status = document.getElementById('statusPump');
                
                if (pumpState) {
                    btn.textContent = "Matikan Pompa";
                    btn.className = "btn btn-on";
                    status.textContent = "Irigasi Aktif (ON)";
                } else {
                    btn.textContent = "Nyalakan Pompa";
                    btn.className = "btn btn-off";
                    status.textContent = "Irigasi Mati (OFF)";
                }
            }
        })
        .catch(error => alert("Gagal menghubungi ESP32! Periksa koneksi WiFi."));
}