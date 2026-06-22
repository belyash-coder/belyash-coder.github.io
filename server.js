const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Эндпоинт для проксирования запросов
app.get('/proxy', async (req, res) => {
    const { url } = req.query; // путь, например: '/search?q=MGMT&type=artist&limit=1'
    const token = req.headers.authorization;
    
    try {
        const response = await axios.get(`https://api.spotify.com/v1${url}`, {
            headers: { 'Authorization': token }
        });
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.message });
    }
});

app.listen(process.env.PORT || 3000);
const axios = require('axios');

// Твой эндпоинт для получения токена
app.get('/get-token', async (req, res) => {
    try {
        const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials', {
            headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        res.json({ access_token: response.data.access_token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});