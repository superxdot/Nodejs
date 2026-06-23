const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
// ⚠️ ใส่ URL ของ Google Apps Script (GAS) Web App ของคุณที่นี่เพื่อบันทึกลง Sheet
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/XXXXX/exec"; 

// ตั้งค่าให้รับข้อมูลแบบ URL-encoded (เพราะ Traccar Client ส่งมาแบบนี้เป็นส่วนใหญ่) และ JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// เสิร์ฟหน้าเว็บ HTML (เราจะสร้างไฟล์ index.html ไว้ในโฟลเดอร์เดียวกัน)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

/**
 * 🛰️ Endpoint สำหรับรับข้อมูลพิกัดจาก Traccar Client หรือแอปอื่นๆ
 * Traccar มักจะยิงมาเป็น GET หรือ POST พร้อม Query parameters 
 * ในโค้ดนี้จะรองรับทั้งค่าที่มากับ URL (Query) และมากับ Body ครับ
 */
app.all('/track', async (req, res) => {
    // ดึงค่าพิกัด ไม่ว่าจะมาแบบ GET (req.query) หรือ POST (req.body)
    const data = {
        id: req.query.id || req.body.id || 'Unknown-Device',
        lat: req.query.lat || req.body.lat,
        lon: req.query.lon || req.body.lon,
        timestamp: req.query.timestamp || req.body.timestamp || Date.now(),
        speed: req.query.speed || req.body.speed || 0
    };

    console.log(`[${new Date().toLocaleTimeString()}] ได้รับข้อมูลจาก ${data.id}: Lat ${data.lat}, Lon ${data.lon}`);

    // 1. ส่งข้อมูลตรงไปหาหน้าเว็บ HTML ผ่าน Socket.io ทันทีแบบ Real-time
    io.emit('locationUpdate', data);

    // 2. ส่งข้อมูลต่อ (Forward) ไปบันทึกที่ Google Sheets ผ่าน GAS
    if (data.lat && data.lon) {
        try {
            // ยิง HTTP POST ไปหา GAS
            axios.post(GAS_WEB_APP_URL, data, {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error("❌ ไม่สามารถส่งข้อมูลไป Google Sheet ได้:", error.message);
        }
    }

    // ตอบกลับไปยัง Traccar Client ว่าได้รับข้อมูลเรียบร้อยแล้ว (HTTP 200)
    res.status(200).send('OK');
});

// เริ่มต้นเปิด Server
server.listen(PORT, () => {
    console.log(`🚀 Server รันเรียบร้อยแล้วที่ http://localhost:${PORT}`);
    console.log(`🛰️ ตั้งค่า URL ใน Traccar Client ให้ชี้มาที่: http://<IP_เครื่องคอมของคุณ>:${PORT}/track`);
});