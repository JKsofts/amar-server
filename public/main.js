// Auth elements
const authContainer = document.getElementById('auth-container');
const connectButton = document.getElementById('connect-button');
const tokenInput = document.getElementById('token-input');

// Agent elements
const agentContainer = document.getElementById('agent-container');
const statusIndicator = document.getElementById('status-indicator');
const startStreamingButton = document.getElementById('start-streaming-button');
const stopStreamingButton = document.getElementById('stop-streaming-button');
const transcriptText = document.getElementById('transcript-text');

let socket;
let mediaRecorder;
let audioContext;
let audioQueue = [];
let isPlaying = false;

// 1. Connect to server with Firebase token
connectButton.addEventListener('click', () => {
  const token = tokenInput.value;
  if (!token) {
    alert('Please enter a Firebase ID token.');
    return;
  }
  connectWebSocket(token);
});

// 2. Set up WebSocket connection
function connectWebSocket(token) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host;
  const wsUrl = `${wsProtocol}//${wsHost}?token=${token}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    authContainer.classList.add('hidden');
    agentContainer.classList.remove('hidden');
    statusIndicator.textContent = 'Status: Connected';
    startStreamingButton.disabled = false;
  };

  socket.onmessage = async (event) => {
    if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        if (message.type === 'transcript') {
            transcriptText.textContent = message.data;
        } else if (message.type === 'error') {
            console.error('Server error:', message.data);
            statusIndicator.textContent = `Error: ${message.data}`;
        }
    } else if (event.data instanceof Blob) {
        // Handle incoming audio blob
        const audioData = await event.data.arrayBuffer();
        audioQueue.push(audioData);
        if (!isPlaying) {
            playNextInQueue();
        }
    }
  };

  socket.onclose = (event) => {
    statusIndicator.textContent = 'Status: Disconnected';
    alert(`Connection closed: ${event.reason} (Code: ${event.code})`);
    stopStreaming();
    authContainer.classList.remove('hidden');
    agentContainer.classList.add('hidden');
  };

  socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
    statusIndicator.textContent = 'Status: Error';
  };
}

// 3. Handle audio streaming
startStreamingButton.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Your browser does not support audio recording.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Initialize AudioContext after user interaction
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        // Convert blob to base64 and send as JSON, as required by many realtime audio APIs
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result.split(',')[1];
          socket.send(JSON.stringify({ type: 'audio_in', data: base64Audio }));
        };
        reader.readAsDataURL(event.data);
      }
    };

    mediaRecorder.start(500); // Collect 500ms chunks of audio

    startStreamingButton.disabled = true;
    stopStreamingButton.disabled = false;
    statusIndicator.textContent = 'Status: Streaming...';
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Could not access microphone. Please grant permission.');
  }
});

stopStreamingButton.addEventListener('click', () => {
  stopStreaming();
});

function stopStreaming() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    startStreamingButton.disabled = false;
    stopStreamingButton.disabled = true;
    statusIndicator.textContent = 'Status: Connected';
}

// 4. Play back audio from the server
async function playNextInQueue() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        return;
    }

    isPlaying = true;
    const audioData = audioQueue.shift();

    try {
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = playNextInQueue; // Play next chunk when this one finishes
        source.start();
    } catch (e) {
        console.error("Error decoding audio data", e);
        isPlaying = false; // Stop playback on error
    }
}