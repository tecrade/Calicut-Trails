let mediaRecorder;
let audioChunks = [];

const startButton = document.getElementById('startRecording');
const stopButton = document.getElementById('stopRecording');
const translateButton = document.getElementById('translateButton');
const englishText = document.getElementById('englishText');
const malayalamText = document.getElementById('malayalamText');
const audioPlayer = document.getElementById('audioPlayer');
const statusElement = document.getElementById('status');

// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

// Event listeners
startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
translateButton.addEventListener('click', translateText);

// Start recording function
function startRecording() {
    englishText.value = '';
    malayalamText.value = '';
    audioPlayer.style.display = 'none';
    startButton.disabled = true;
    stopButton.disabled = false;
    
    recognition.start();
    updateStatus('Recording...');
}

// Stop recording function
function stopRecording() {
    recognition.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
    updateStatus('Recording stopped');
}

// Recognition results handler
recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }

    englishText.value = finalTranscript || interimTranscript;
};

// Translation function
async function translateText() {
    if (!englishText.value.trim()) {
        updateStatus('Please record some text first');
        return;
    }

    updateStatus('Translating...');
    
    try {
        const response = await fetch('http://localhost:3000/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: englishText.value }),
        });

        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();
        malayalamText.value = data.translatedText;
        
        // Update audio player
        audioPlayer.style.display = 'block';
        const audioSource = document.getElementById('audioSource');
        audioSource.src = data.audioFile + '?t=' + new Date().getTime(); // Cache busting
        audioPlayer.load();
        
        updateStatus('Translation complete');
    } catch (error) {
        console.error('Error:', error);
        updateStatus('Error: ' + error.message);
    }
}

// Status update helper
function updateStatus(message) {
    statusElement.textContent = message;
}

// Error handling
recognition.onerror = (event) => {
    console.error('Recognition error:', event.error);
    updateStatus('Error: ' + event.error);
    stopRecording();
};