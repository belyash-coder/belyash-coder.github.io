const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const tokenUrl = Buffer.from('aHR0cHM6Ly9hY2NvdW50cy5zcG90aWZ5LmNvbS9hcGkvdG9rZW4=', 'base64').toString('utf-8');
const apiUrl = Buffer.from('aHR0cHM6Ly9hcGkuc3BvdGlmeS5jb20vdjE=', 'base64').toString('utf-8');

app.get('/search-artist', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Введите имя артиста" });

    try {
        const clientId = (process.env.CLIENT_ID || '').trim();
        const clientSecret = (process.env.CLIENT_SECRET || '').trim();

        if (!clientId || !clientSecret) {
            return res.status(500).json({ error: "Ключи доступа отсутствуют" });
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await axios.post(tokenUrl,
            'grant_type=client_credentials', {
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const token = tokenResponse.data.access_token;

        const searchRes = await axios.get(`${apiUrl}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!searchRes.data.artists || !searchRes.data.artists.items.length) {
            return res.json({ found: false });
        }

        const artist = searchRes.data.artists.items[0];

        const tracksRes = await axios.get(`${apiUrl}/artists/${artist.id}/top-tracks?market=US`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const relatedRes = await axios.get(`${apiUrl}/artists/${artist.id}/related-artists`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        res.json({
            found: true,
            artist: artist,
            tracks: tracksRes.data.tracks ? tracksRes.data.tracks.slice(0, 5) : [],
            related: relatedRes.data.artists ? relatedRes.data.artists.slice(0, 5) : []
        });

    } catch (error) {
        console.error("Системный сбой:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Ошибка связи", 
            details: error.response ? error.response.data : error.message 
        });
    }
});

// Экспорт приложения для бессерверной среды Vercel
module.exports = app;