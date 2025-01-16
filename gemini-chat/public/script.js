// const chatContainer = document.getElementById('chat-container');
// const messageInput = document.getElementById('message-input');
// const sendButton = document.getElementById('send-button');

// sendButton.addEventListener('click', sendMessage);
// messageInput.addEventListener('keypress', (e) => {
//     if (e.key === 'Enter') {
//         sendMessage();
//     }
// });

// async function sendMessage() {
//     const message = messageInput.value.trim();
//     if (!message) return;

//     // Add user message
//     addMessage(message, 'user');
//     messageInput.value = '';

//     try {
//         const response = await fetch('http://localhost:3000/chat', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ message }),
//         });

//         const data = await response.json();
//         addMessage(data.response, 'bot');
//     } catch (error) {
//         console.error('Error:', error);
//         addMessage('Sorry, something went wrong!', 'bot');
//     }
// }

// function addMessage(text, sender) {
//     const messageDiv = document.createElement('div');
//     messageDiv.classList.add('message', `${sender}-message`);
//     messageDiv.textContent = text;
//     chatContainer.appendChild(messageDiv);
//     chatContainer.scrollTop = chatContainer.scrollHeight;
// }

//final working code base
let map;
let markers = [];
let routingControl;

// Initialize map
function initMap() {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Initialize when page loads
window.onload = initMap;

// Geolocation: Get user's current position and fetch place name
// Get user location and update the city input field
async function getUserLocation() {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Reverse geocode the coordinates to get the place name
        const response = await fetch(`/geocode?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (data.length > 0) {
            const cityName = data[0].display_name.split(',')[0]; // Extract city from the response
            document.getElementById('city').value = cityName; // Set the city field to the found city
            return cityName;
        } else {
            alert('Unable to fetch the city from geolocation.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching geolocation:', error);
        alert('Geolocation is not available or permission was denied. Please enable location permissions.');
        return null;
    }
}

// Event listener for "Use My Current Location" button
document.getElementById('useGeolocation').addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent form submission on button click

    const city = await getUserLocation();
    if (city) {
        // Optionally, you can trigger the form submission or any further actions here after getting the location
        console.log(`User's city is: ${city}`);
        // If you need to submit the form after getting location, you can trigger form submit here:
        // document.getElementById('tripForm').submit();
    }
});


// Event listener for trip form submission
document.getElementById('tripForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    let city = document.getElementById('city').value;
    const duration = document.getElementById('duration').value;
    const interests = document.getElementById('interests').value;

    // If the city is empty, try to fetch it using geolocation
    if (!city) {
        city = await getUserLocation();
        if (!city) {
            return; // Stop if we couldn't fetch the city
        }
    }

    try {
        // Get itinerary from server
        const response = await fetch('/plan-trip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ city, duration, interests }),
        });

        const itinerary = await response.json();
        displayItinerary(itinerary);
        await plotLocations(itinerary, city);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to plan trip. Please try again.');
    }
});

// Function to geocode location (using geocoding API)
async function geocodeLocation(query) {
    const response = await fetch('/geocode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });
    const data = await response.json();
    if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    throw new Error('Location not found');
}

// Function to plot locations on the map
async function plotLocations(itinerary, city) {
    // Clear existing markers and routes
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // Center map on the city
    const cityCoords = await geocodeLocation(city);
    map.setView(cityCoords, 13);

    // Plot places and food spots
    for (const day of itinerary.days) {
        const dayMarkers = [];
        // Mark places from the itinerary
        for (const place of day.places) {
            try {
                const coords = await geocodeLocation(`${place.name}, ${city}`);
                const marker = L.marker(coords)
                    .bindPopup(`<b>${place.name}</b><br>Duration: ${place.duration} hours<br>${place.description}`)
                    .addTo(map);
                markers.push(marker);
                dayMarkers.push(coords);
            } catch (error) {
                console.error(`Error plotting ${place.name}:`, error);
            }
        }

        // Mark restaurants
        for (const restaurant of day.restaurants) {
            try {
                const coords = await geocodeLocation(`${restaurant.name}, ${city}`);
                const marker = L.marker(coords)
                    .bindPopup(`<b>${restaurant.name}</b><br>Type: ${restaurant.type}<br>Best for: ${restaurant.bestFor}`)
                    .addTo(map);
                markers.push(marker);
            } catch (error) {
                console.error(`Error plotting restaurant ${restaurant.name}:`, error);
            }
        }

        // Create route if there are multiple locations
        if (dayMarkers.length > 1) {
            const waypoints = dayMarkers.map(coord => L.latLng(coord[0], coord[1]));
            routingControl = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: true,
                lineOptions: {
                    styles: [{ color: '#2196f3', opacity: 0.6, weight: 4 }]
                }
            }).addTo(map);
        }
    }

    // Mark accommodation if available
    if (itinerary.accommodation) {
        try {
            const coords = await geocodeLocation(`${itinerary.accommodation.suggestion}, ${city}`);
            const marker = L.marker(coords)
                .bindPopup(`<b>${itinerary.accommodation.suggestion}</b><br>Cost: ${itinerary.accommodation.cost}<br>Area: ${itinerary.accommodation.area}`)
                .addTo(map);
            markers.push(marker);
        } catch (error) {
            console.error(`Error plotting accommodation:`, error);
        }
    }
}

// Function to display the itinerary
function displayItinerary(itinerary) {
    const itineraryDiv = document.getElementById('itinerary');
    itineraryDiv.innerHTML = ''; // Clear existing content

    itinerary.days.forEach(day => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';

        daySection.innerHTML = `
            <h2>Day ${day.day}</h2>
            <div class="places">
                ${day.places.map(place => `
                    <div class="place">
                        <h3>${place.name}</h3>
                        <p>Duration: ${place.duration} hours</p>
                        <p>${place.description}</p>
                        <p>Cost: ${place.cost}</p>
                    </div>
                `).join('')}
            </div>
            
            <h3>Food Recommendations</h3>
            <div class="restaurants">
                ${day.restaurants.map(restaurant => `
                    <div class="restaurant">
                        <h4>${restaurant.name}</h4>
                        <p>Type: ${restaurant.type}</p>
                        <p>Cost: ${restaurant.cost}</p>
                        <p>Best for: ${restaurant.bestFor}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        itineraryDiv.appendChild(daySection);
    });

    // Accommodation section if duration > 1 day
    if (itinerary.accommodation) {
        const accommodationDiv = document.createElement('div');
        accommodationDiv.className = 'accommodation-section';
        accommodationDiv.innerHTML = `
            <h3>Accommodation Recommendation</h3>
            <div>
                <h4>${itinerary.accommodation.suggestion}</h4>
                <p>Cost: ${itinerary.accommodation.cost}</p>
                <p>Area: ${itinerary.accommodation.area}</p>
            </div>
        `;
        itineraryDiv.appendChild(accommodationDiv);
    }
}



//final code working extra 1

// script.js
// let map;
// let markers = [];
// let routingControl;
// let userLocation = null;

// // Initialize map
// function initMap() {
//     map = L.map('map').setView([0, 0], 13);
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         attribution: '© OpenStreetMap contributors'
//     }).addTo(map);

//     // Add location control button
//     L.control.locate({
//         position: 'topright',
//         strings: {
//             title: "Show my location"
//         },
//         onLocationError: (err) => {
//             alert("Location access denied. Please enter location manually.");
//         },
//         onLocationOutsideMapBounds: () => {
//             alert("You seem to be outside the map bounds.");
//         }
//     }).addTo(map);
// }

// // Get current location
// function getCurrentLocation() {
//     return new Promise((resolve, reject) => {
//         if (!navigator.geolocation) {
//             reject(new Error('Geolocation is not supported by your browser'));
//             return;
//         }

//         navigator.geolocation.getCurrentPosition(
//             async (position) => {
//                 userLocation = {
//                     lat: position.coords.latitude,
//                     lng: position.coords.longitude
//                 };
                
//                 // Reverse geocode to get city name
//                 try {
//                     const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lng}&format=json`);
//                     const data = await response.json();
//                     const cityName = data.address.city || data.address.town || data.address.village;
//                     document.getElementById('city').value = cityName;
//                     resolve(userLocation);
//                 } catch (error) {
//                     reject(error);
//                 }
//             },
//             (error) => {
//                 reject(error);
//             }
//         );
//     });
// }

// // Update form event listener
// document.getElementById('tripForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
    
//     const formData = {
//         city: document.getElementById('city').value,
//         duration: document.getElementById('duration').value,
//         travelGroup: document.getElementById('travelGroup').value,
//         budget: document.getElementById('budget').value,
//         foodPreference: document.getElementById('foodPreference').value,
//         interests: document.getElementById('interests').value,
//         accommodation: document.getElementById('accommodation').value,
//         transportMode: document.getElementById('transportMode').value
//     };

//     try {
//         const response = await fetch('/plan-trip', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(formData),
//         });

//         const itinerary = await response.json();
//         displayItinerary(itinerary);
//         await plotLocations(itinerary, formData.city);
//     } catch (error) {
//         console.error('Error:', error);
//         alert('Failed to plan trip. Please try again.');
//     }
// });

// function displayItinerary(itinerary) {
//     const itineraryDiv = document.getElementById('itinerary');
//     itineraryDiv.innerHTML = '';

//     // If multi-day trip, show accommodation first
//     if (itinerary.accommodation) {
//         const accommodationSection = document.createElement('div');
//         accommodationSection.className = 'accommodation-section';
//         accommodationSection.innerHTML = `
//             <h2>Recommended Accommodation</h2>
//             <div class="accommodation-card">
//                 <h3>${itinerary.accommodation.suggestion}</h3>
//                 <p>Area: ${itinerary.accommodation.area}</p>
//                 <p>Cost per night: ${itinerary.accommodation.cost}</p>
//             </div>
//         `;
//         itineraryDiv.appendChild(accommodationSection);
//     }

//     // Display daily itinerary
//     itinerary.days.forEach(day => {
//         const daySection = document.createElement('div');
//         daySection.className = 'day-section';
        
//         let dayContent = `<h2>Day ${day.day}</h2>`;

//         // Places to visit
//         dayContent += `
//             <div class="places-section">
//                 <h3>Places to Visit</h3>
//                 ${day.places.map(place => `
//                     <div class="place-card">
//                         <h4>${place.name}</h4>
//                         <p>Duration: ${place.duration}</p>
//                         <p>${place.description}</p>
//                         <p>Estimated cost: ${place.cost}</p>
//                     </div>
//                 `).join('')}
//             </div>
//         `;

//         // Restaurants
//         if (day.restaurants && day.restaurants.length > 0) {
//             dayContent += `
//                 <div class="restaurants-section">
//                     <h3>Recommended Restaurants</h3>
//                     ${day.restaurants.map(restaurant => `
//                         <div class="restaurant-card">
//                             <h4>${restaurant.name}</h4>
//                             <p>Cuisine: ${restaurant.type}</p>
//                             <p>Best for: ${restaurant.bestFor}</p>
//                             <p>Price range: ${restaurant.cost}</p>
//                         </div>
//                     `).join('')}
//                 </div>
//             `;
//         }

//         daySection.innerHTML = dayContent;
//         itineraryDiv.appendChild(daySection);
//     });

//     // Add Google Maps link
//     const locations = itinerary.days.flatMap(day => 
//         [...day.places.map(p => p.name), 
//          ...(day.restaurants || []).map(r => r.name)]
//     ).join('|');
    
//     const googleMapsLink = document.createElement('div');
//     googleMapsLink.className = 'google-maps-link';
//     googleMapsLink.innerHTML = `
//         <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(itinerary.days[0].places[0].name)}&destination=${encodeURIComponent(itinerary.days[0].places[0].name)}&waypoints=${encodeURIComponent(locations)}" 
//            target="_blank" 
//            class="map-link-button">
//            Open in Google Maps
//         </a>
//     `;
//     itineraryDiv.appendChild(googleMapsLink);
// }

// async function plotLocations(itinerary, city) {
//     // Clear existing markers and routes
//     markers.forEach(marker => map.removeLayer(marker));
//     markers = [];
//     if (routingControl) {
//         map.removeControl(routingControl);
//     }

//     // Plot accommodation if multi-day trip
//     if (itinerary.accommodation) {
//         try {
//             const accommodationCoords = await geocodeLocation(`${itinerary.accommodation.suggestion}, ${city}`);
//             const accommodationMarker = L.marker(accommodationCoords, {
//                 icon: L.divIcon({
//                     html: '🏨',
//                     className: 'accommodation-marker'
//                 })
//             })
//             .bindPopup(`
//                 <b>${itinerary.accommodation.suggestion}</b><br>
//                 Cost: ${itinerary.accommodation.cost}<br>
//                 Area: ${itinerary.accommodation.area}
//             `)
//             .addTo(map);
//             markers.push(accommodationMarker);
//         } catch (error) {
//             console.error('Error plotting accommodation:', error);
//         }
//     }

//     // Plot daily locations including restaurants
//     for (const day of itinerary.days) {
//         const dayLocations = [];

//         // Plot places
//         for (const place of day.places) {
//             try {
//                 const coords = await geocodeLocation(`${place.name}, ${city}`);
//                 const marker = L.marker(coords, {
//                     icon: L.divIcon({
//                         html: '📍',
//                         className: 'place-marker'
//                     })
//                 })
//                 .bindPopup(`
//                     <b>${place.name}</b><br>
//                     Duration: ${place.duration}<br>
//                     Cost: ${place.cost}<br>
//                     ${place.description}
//                 `)
//                 .addTo(map);
//                 markers.push(marker);
//                 dayLocations.push(coords);
//             } catch (error) {
//                 console.error(`Error plotting ${place.name}:`, error);
//             }
//         }

//         // Plot restaurants
//         if (day.restaurants) {
//             for (const restaurant of day.restaurants) {
//                 try {
//                     const coords = await geocodeLocation(`${restaurant.name}, ${city}`);
//                     const marker = L.marker(coords, {
//                         icon: L.divIcon({
//                             html: '🍽️',
//                             className: 'restaurant-marker'
//                         })
//                     })
//                     .bindPopup(`
//                         <b>${restaurant.name}</b><br>
//                         Cuisine: ${restaurant.type}<br>
//                         Price: ${restaurant.cost}<br>
//                         Best for: ${restaurant.bestFor}
//                     `)
//                     .addTo(map);
//                     markers.push(marker);
//                     dayLocations.push(coords);
//                 } catch (error) {
//                     console.error(`Error plotting ${restaurant.name}:`, error);
//                 }
//             }
//         }

//         // Create route for the day
//         if (dayLocations.length > 1) {
//             const waypoints = dayLocations.map(coord => L.latLng(coord[0], coord[1]));
//             const route = L.Routing.control({
//                 waypoints: waypoints,
//                 routeWhileDragging: false,
//                 lineOptions: {
//                     styles: [{ color: `#${Math.floor(Math.random()*16777215).toString(16)}`, opacity: 0.6, weight: 4 }]
//                 }
//             }).addTo(map);
            
//             if (!routingControl) routingControl = route;
//         }
//     }
// }

// // Initialize when page loads
// window.onload = () => {
//     initMap();
    
//     // Add location button to form
//     const locationBtn = document.createElement('button');
//     locationBtn.type = 'button';
//     locationBtn.id = 'useLocation';
//     locationBtn.textContent = 'Use Current Location';
//     locationBtn.onclick = async () => {
//         try {
//             await getCurrentLocation();
//             map.setView([userLocation.lat, userLocation.lng], 13);
//         } catch (error) {
//             alert('Error getting location: ' + error.message);
//         }
//     };
//     document.getElementById('city').parentNode.insertBefore(locationBtn, document.getElementById('city').nextSibling);
// };


