const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');

app.use(cors());

app.get('/get-token', async (req, res) => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials', {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from('631ff3f6b3e5434fb1d50c201ae509ae:c439abc33c074f6391eb001a31cb0930').toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error');
    }
});

app.listen(process.env.PORT || 3000);