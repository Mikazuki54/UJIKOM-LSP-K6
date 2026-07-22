// ================= KONFIGURASI THINGSPEAK =================
const CHANNEL_ID = "3433062";    
const READ_API_KEY = "E7CPKFDQBTQTRPRU"; 
// ==========================================================

const maxDataPoints = 10; 
let timeLabels = [];

function createChart(ctx, label, color) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '33',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// Menyesuaikan label dan warna
const chart1 = createChart(document.getElementById('chartSensor1').getContext('2d'), 'Suhu (°C)', '#e74c3c'); // Merah
const chart2 = createChart(document.getElementById('chartSensor2').getContext('2d'), 'Kel. Udara (%)', '#3498db'); // Biru
const chart3 = createChart(document.getElementById('chartSensor3').getContext('2d'), 'Kel. Tanah (%)', '#8e44ad'); // Ungu

function fetchThingSpeakData() {
    const url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=1`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.feeds && data.feeds.length > 0) {
                const feed = data.feeds[0];
                const valS1 = feed.field1 || 0; 
                const valS2 = feed.field2 || 0;
                const valS3 = feed.field3 || 0;
                const timeString = new Date(feed.created_at).toLocaleTimeString('id-ID');

                if (timeLabels.length > maxDataPoints) {
                    timeLabels.shift();
                    chart1.data.datasets[0].data.shift();
                    chart2.data.datasets[0].data.shift();
                    chart3.data.datasets[0].data.shift();
                }
                
                timeLabels.push(timeString);
                chart1.data.datasets[0].data.push(valS1);
                chart2.data.datasets[0].data.push(valS2);
                chart3.data.datasets[0].data.push(valS3);
                
                chart1.update();
                chart2.update();
                chart3.update();
            }
        })
        .catch(error => console.error('Gagal menarik data dari ThingSpeak:', error));
}

setInterval(fetchThingSpeakData, 15000);
fetchThingSpeakData();

let act1State = false;
let act2State = false;

function toggleActuator(id) {
    const btn = document.getElementById(`btnAct${id}`);
    const statusText = document.getElementById(`status${id}`);
    let stateParam;
    
    if (id === 1) {
        act1State = !act1State;
        updateButton(btn, statusText, act1State);
        stateParam = act1State ? 1 : 0;
    } else {
        act2State = !act2State;
        updateButton(btn, statusText, act2State);
        stateParam = act2State ? 1 : 0;
    }

    fetch(`/actuator?id=${id}&state=${stateParam}`)
        .then(response => response.text())
        .then(data => console.log("Respon Wemos32:", data))
        .catch(error => alert('Gagal mengirim perintah. Pastikan ESP32 aktif. Error: ' + error));
}

function updateButton(btn, statusText, state) {
    if (state) {
        btn.textContent = btn.id === 'btnAct1' ? "Matikan Pompa" : "Matikan Kipas";
        btn.className = "btn btn-on";
        statusText.textContent = "Status: ON";
    } else {
        btn.textContent = btn.id === 'btnAct1' ? "Nyalakan Pompa" : "Nyalakan Kipas";
        btn.className = "btn btn-off";
        statusText.textContent = "Status: OFF";
    }
}