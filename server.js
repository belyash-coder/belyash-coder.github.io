const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Берем ключ Last.fm из настроек Vercel
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

app.get('/search-artist', async (req, res) => {
    const artistName = req.query.name;

    if (!artistName) {
        return res.status(400).json({ error: 'Не указано имя артиста' });
    }

    try {
        // 1. Получаем био и теги артиста из Last.fm
        const infoUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json&autocorrect=1`;
        const infoResponse = await axios.get(infoUrl);
        
        if (infoResponse.data.error) {
             return res.status(404).json({ error: 'Артист не найден в базе' });
        }
        
        const artistData = infoResponse.data.artist;

        // 2. Получаем похожих артистов из Last.fm
        const similarUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&limit=8&format=json&autocorrect=1`;
        const similarResponse = await axios.get(similarUrl);
        const similarArtists = similarResponse.data.similarartists.artist.map(a => a.name);

        // 3. Ищем топ-треки с обложками и превью аудио в iTunes API (полностью бесплатно и без ключей)
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistData.name)}&entity=musicTrack&limit=20`;
        const itunesResponse = await axios.get(itunesUrl);
        
        // Отбираем только те треки, у которых есть превью (30 секунд)
        const topTracks = itunesResponse.data.results
            .filter(track => track.previewUrl)
            .slice(0, 10) // Берем 10 лучших
            .map(track => ({
                name: track.trackName,
                preview_url: track.previewUrl,
                cover: track.artworkUrl100.replace('100x100bb', '300x300bb'), // Увеличиваем качество обложки
                album: track.collectionName
            }));

        // Формируем чистый JSON для фронтенда
        const responseData = {
            name: artistData.name,
            bio: artistData.bio && artistData.bio.summary ? artistData.bio.summary.split('<a')[0].trim() : '', // Чистим текст от HTML-ссылок
            tags: artistData.tags && artistData.tags.tag ? artistData.tags.tag.map(t => t.name) : [],
            similar: similarArtists,
            tracks: topTracks
        };

        res.json(responseData);

    } catch (error) {
        console.error('Ошибка сервера:', error.message);
        res.status(500).json({ error: 'Ошибка при сборе данных об артисте' });
    }
});

module.exports = app;