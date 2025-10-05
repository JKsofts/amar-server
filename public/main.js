const authContainer = document.getElementById('auth-container');
const connectButton = document.getElementById('connect-button');
const tokenInput = document.getElementById('token-input');

const chatContainer = document.getElementById('chat-container');
const chatWindow = document.getElementById('chat-window');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

let socket;

connectButton.addEventListener('click', () => {
  const token = tokenInput.value;
  if (!token) {
    alert('Please enter a Firebase ID token.');
    return;
  }

  connectWebSocket(token);
});

function connectWebSocket(token) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host;
  const wsUrl = `${wsProtocol}//${wsHost}?token=${token}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    authContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    displayMessage('system', 'Connected to the partner agent.');
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'gpt-response':
        displayMessage('agent', message.data);
        break;
      case 'partner-search-results':
        if (message.data.length > 0) {
          let partnerList = 'Found partners:<br>';
          message.data.forEach(p => {
            partnerList += `- ${p.name} (Expertise: ${p.expertise})<br>`;
          });
          displayMessage('system', partnerList);
        } else {
          displayMessage('system', 'No partners found matching your criteria.');
        }
        break;
      case 'error':
        displayMessage('error', message.data);
        break;
    }
  };

  socket.onclose = (event) => {
    if (!chatContainer.classList.contains('hidden')) {
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
    }
    const reason = event.reason || 'Connection closed.';
    alert(`Connection closed: ${reason} (Code: ${event.code})`);
    displayMessage('error', `Connection closed. Please refresh and try again.`);
  };

  socket.onerror = (error) => {
    displayMessage('error', `WebSocket Error: ${error.message}. Please check the console.`);
  };
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value;
  if (message && socket && socket.readyState === WebSocket.OPEN) {
    displayMessage('user', message);
    socket.send(message);
    messageInput.value = '';
  } else {
    alert('Not connected to the server.');
  }
});

function displayMessage(sender, text) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${sender}-message`);
  messageElement.innerHTML = text; // Using innerHTML to render line breaks from the server
  messages.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}