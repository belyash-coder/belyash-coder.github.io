const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Единый эндпоинт: сервер сам берет токен и сам собирает все данные
app.get('/search-artist', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Введите имя артиста" });

    try {
        // 1. Получаем токен (безопасно, ключи скрыты на сервере)
        const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token',
            'grant_type=client_credentials', {
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const token = tokenResponse.data.access_token;

        // 2. Ищем артиста
        const searchRes = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!searchRes.data.artists.items.length) {
            return res.json({ found: false });
        }

        const artist = searchRes.data.artists.items[0];

        // 3. Получаем топовые треки
        const tracksRes = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 4. Получаем похожих артистов
        const relatedRes = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/related-artists`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 5. Упаковываем и отправляем на фронтенд
        res.json({
            found: true,
            artist: artist,
            tracks: tracksRes.data.tracks.slice(0, 5),
            related: relatedRes.data.artists.slice(0, 5)
        });

    } catch (error) {
        console.error("Ошибка сервера:", error.message);
        res.status(500).json({ error: "Ошибка при связи со Spotify" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));