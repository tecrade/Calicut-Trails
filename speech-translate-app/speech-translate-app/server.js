const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');  // Add Gemini API import

const app = express();
const port = 3000;

// Initialize Gemini with your API key
const genAI = new GoogleGenerativeAI('AIzaSyBQVoYFNYEKnhORHqd6NZYBt-hLzaHaox0'); // Replace with your actual API key

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.post('/translate', async (req, res) => {
    try {
        const { text } = req.body;

        // Translate text to Malayalam using Google Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Translate the following sentence from English to Malayalam ,just use malayalam words dont include manglish words for ge the output for "hello my name is Surya" should be just  "ഹലോ എൻ്റെ പേര് സൂര്യ" dont include maglish word like (Halo, ente per Suryaanu.): "${text}"`;

        // Send request to Gemini model
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translation = response.text();  // Get the translated text

        // Generate speech using Python script (TTS)
        exec(`python tts.py "${translation}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                return res.status(500).json({ error: 'Text-to-speech conversion failed' });
            }
            res.json({
                originalText: text,
                translatedText: translation,
                audioFile: 'output.mp3'  // Path to the generated speech file
            });
        });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: 'Translation failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
