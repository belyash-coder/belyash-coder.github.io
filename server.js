const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

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
        const correctedName = artistData.name;

        // 2. Получаем похожих артистов и их фото
        const similarUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(correctedName)}&api_key=${LASTFM_API_KEY}&limit=8&format=json&autocorrect=1`;
        const similarResponse = await axios.get(similarUrl);
        
        let similarArtists = [];
        if (similarResponse.data.similarartists && similarResponse.data.similarartists.artist) {
            const rawSimilar = similarResponse.data.similarartists.artist.slice(0, 8);
            similarArtists = await Promise.all(rawSimilar.map(async (simArtist) => {
                let simAvatar = '';
                try {
                    const dzUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(simArtist.name)}`;
                    const dzRes = await axios.get(dzUrl);
                    if (dzRes.data && dzRes.data.data && dzRes.data.data.length > 0) {
                        simAvatar = dzRes.data.data[0].picture_medium || '';
                    }
                } catch (err) {}
                return { name: simArtist.name, picture: simAvatar };
            }));
        }

        // 3. Получаем фото и фанатов главного артиста
        let avatarUrl = '';
        let fansCount = 0;
        try {
            const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(correctedName)}`;
            const deezerResponse = await axios.get(deezerUrl);
            
            if (deezerResponse.data && deezerResponse.data.data && deezerResponse.data.data.length > 0) {
                const deezerArtist = deezerResponse.data.data[0];
                avatarUrl = deezerArtist.picture_xl || deezerArtist.picture_medium || '';
                fansCount = deezerArtist.nb_fan || 0;
            }
        } catch (deezerError) {
            console.error('Ошибка Deezer API:', deezerError.message);
        }

        // 4. ТРЕКИ: План А (iTunes)
        let topTracks = [];
        try {
            const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(correctedName)}&entity=musicTrack&attribute=artistTerm&limit=30`;
            const itunesResponse = await axios.get(itunesUrl);
            
            topTracks = itunesResponse.data.results
                .filter(track => track.previewUrl)
                .filter(track => track.artistName.toLowerCase().includes(correctedName.toLowerCase()))
                .slice(0, 10) 
                .map(track => ({
                    name: track.trackName,
                    preview_url: track.previewUrl,
                    cover: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : '', 
                    album: track.collectionName
                }));
        } catch (err) {
            console.error('Ошибка iTunes API:', err.message);
        }

        // 5. ТРЕКИ: План Б (Deezer Fallback), если iTunes вернул пустоту
        if (topTracks.length === 0) {
            try {
                // Ищем треки с привязкой к конкретному артисту
                const dzTracksUrl = `https://api.deezer.com/search?q=artist:"${encodeURIComponent(correctedName)}"&limit=30`;
                const dzTracksResponse = await axios.get(dzTracksUrl);
                
                if (dzTracksResponse.data && dzTracksResponse.data.data) {
                    topTracks = dzTracksResponse.data.data
                        .filter(track => track.preview) // Строго с превью
                        .slice(0, 10)
                        .map(track => ({
                            name: track.title,
                            preview_url: track.preview,
                            cover: track.album ? track.album.cover_medium : '', 
                            album: track.album ? track.album.title : 'Неизвестный альбом'
                        }));
                }
            } catch (err) {
                console.error('Ошибка Deezer Tracks API:', err.message);
            }
        }

        const responseData = {
            name: correctedName,
            bio: artistData.bio && artistData.bio.summary ? artistData.bio.summary.split('<a')[0].trim() : '', 
            tags: artistData.tags && artistData.tags.tag ? artistData.tags.tag.map(t => t.name) : [],
            similar: similarArtists,
            tracks: topTracks,
            avatar: avatarUrl,
            fans: fansCount
        };

        res.json(responseData);

    } catch (error) {
        console.error('Ошибка сервера:', error.message);
        res.status(500).json({ error: 'Ошибка при сборе данных об артисте' });
    }
});

module.exports = app;