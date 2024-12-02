const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { saveAs } = require('file-saver');
const app = express();
app.use(cors());

const port = 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'index.html')));

// API to extract images
app.get('/extract-images', async (req, res) => {
    const url = req.query.url;
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const imageUrls = [];
        $('img').each((index, element) => {
            const src = $(element).attr('src');
            if (src) {
                imageUrls.push(new URL(src, url).href);
            }
        });
        res.json({ success: true, images: imageUrls });
    } catch (error) {
        res.json({ success: false, message: 'Failed to extract images' });
    }
});

// Route to download individual images
app.get('/download-image', async (req, res) => {
    const imgUrl = req.query.url;
    try {
        const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', 'image/jpeg'); // Modify if needed based on image type
        res.setHeader('Content-Disposition', `attachment; filename=${path.basename(imgUrl)}`);
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to download image' });
    }
});

// Route to download all images as a ZIP
app.get('/download-all-images', async (req, res) => {
    const images = req.query.images.split(','); // Receive image URLs as a comma-separated list
    try {
        const zip = new JSZip();
        const folder = zip.folder('images');

        for (const imgUrl of images) {
            const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            const fileName = path.basename(imgUrl);
            folder.file(fileName, response.data);
        }

        // Generate the ZIP file and send as response
        zip.generateAsync({ type: 'nodebuffer' }).then((content) => {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename=images.zip');
            res.send(content);
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to download all images' });
    }
});

// Render the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
