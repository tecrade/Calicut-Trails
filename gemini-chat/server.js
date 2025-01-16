// 

// const express = require('express');
// const cors = require('cors');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const axios = require('axios');

// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // Initialize Gemini API
// const GEMINI_API_KEY = 'AIzaSyDDjl8ZZjjhD49BmSbtWk-iOB5IAnS6LaM';
// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// // Nominatim geocoding endpoint
// const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

// app.post('/geocode', async (req, res) => {
//     try {
//         const { query } = req.body;
//         const response = await axios.get(`${NOMINATIM_ENDPOINT}?format=json&q=${encodeURIComponent(query)}`);
//         res.json(response.data);
//     } catch (error) {
//         console.error('Geocoding error:', error);
//         res.status(500).json({ error: 'Geocoding failed' });
//     }
// });

// app.post('/plan-trip', async (req, res) => {
//     try {
//         const { city, duration, interests } = req.body;
        
//         const prompt = `Create a ${duration}-day trip itinerary for ${city} focusing on ${interests}. 
//         For each place, provide: name, suggested duration of visit (in hours), and what makes it special. 
//         Format the response as JSON with this structure:
//         {
//             "days": [
//                 {
//                     "day": 1,
//                     "places": [
//                         {
//                             "name": "Place Name",
//                             "duration": "visit duration in hours",
//                             "description": "brief description"
//                         }
//                     ]
//                 }
//             ]
//         }`;

//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         const itinerary = JSON.parse(response.text());
        
//         res.json(itinerary);
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ error: 'Failed to generate itinerary' });
//     }
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });


// test code

// File: server.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GEMINI_API_KEY = 'AIzaSyDDjl8ZZjjhD49BmSbtWk-iOB5IAnS6LaM';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.post('/plan-trip', async (req, res) => {
    try {
        const { 
            city, 
            duration, 
            travelGroup, 
            budget,
            foodPreference,
            interests,
            accommodation,
            transportMode
        } = req.body;
        
        // Structured prompt to ensure JSON response
        const prompt = `Generate a travel itinerary as a JSON object for ${city} for ${duration} days.
        Travel preferences.text in json file should be english:
        - Group: ${travelGroup}
        - Budget: ${budget}
        - Food: ${foodPreference}
        - Interests: ${interests}
        - Stay: ${accommodation}
        - Transport: ${transportMode}

        Respond ONLY with a valid JSON object in this exact format:
        {
          "days": [
            {
              "day": 1,
              "places": [
                {
                  "name": "location name",
                  "duration": "number of hours",
                  "description": "brief description",
                  "cost": "estimated cost in rupees",
                  "category": "morning/afternoon/evening"
                }
              ],
              "restaurants": [
                {
                  "name": "restaurant name",
                  "type": "cuisine type",
                  "cost": "price range",
                  "bestFor": "meal suggestion"
                }
              ]
            }
          ],
          "estimatedTotalCost": "total in rupees",
          "accommodation": {
            "suggestion": "hotel/hostel name",
            "cost": "price per night",
            "area": "location"
          }
        }

        Include only these exact fields in your JSON response. Do not add any explanation or extra text.analyse the data carefully like the food preference.suggest food spots.check the suggested locations are inside specified city only then proceed.suggest food spots based on food preference.dont suggest thalassery fort`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let responseText = response.text();

        // Clean up the response text to ensure valid JSON
        responseText = responseText.trim();
        if (responseText.startsWith('```json')) {
            responseText = responseText.slice(7, -3).trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.slice(3, -3).trim();
        }

        try {
            const itinerary = JSON.parse(responseText);
            res.json(itinerary);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.log('Raw Response:', responseText);
            
            // Fallback response if parsing fails
            res.json({
                days: [{
                    day: 1,
                    places: [{
                        name: "Generated response was not valid JSON",
                        duration: "N/A",
                        description: "Please try again",
                        cost: "N/A",
                        category: "morning"
                    }],
                    restaurants: []
                }],
                estimatedTotalCost: "N/A",
                accommodation: {
                    suggestion: "N/A",
                    cost: "N/A",
                    area: "N/A"
                }
            });
        }
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate itinerary',
            details: error.message 
        });
    }
});

// Nominatim geocoding endpoint
app.post('/geocode', async (req, res) => {
    try {
        const { query } = req.body;
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
            {
                headers: {
                    'User-Agent': 'TripPlanner/1.0'
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({ error: 'Geocoding failed' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});