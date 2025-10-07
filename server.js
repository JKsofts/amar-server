require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const url = require('url');

const { admin } = require('./src/firebase');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// This is a placeholder for the actual OpenAI Realtime API endpoint
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime/sessions';

if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in the .env file.");
}

app.use(express.static(path.join(__dirname, 'public')));

// Handle client connections
wss.on('connection', async (clientWs, req) => {
    const { query } = url.parse(req.url, true);
    const token = query.token;

    // 1. Authenticate the client connection
    try {
        await admin.auth().verifyIdToken(token);
        console.log('Client authenticated successfully.');
    } catch (error) {
        console.error('Client authentication failed:', error.message);
        clientWs.close(1008, 'Authentication failed');
        return;
    }

    // 2. Create a new WebSocket connection to OpenAI's Realtime API
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    });

    // 3. Proxy messages from our client to OpenAI
    clientWs.on('message', (message) => {
        if (openaiWs.readyState === WebSocket.OPEN) {
            // Forward the message directly to OpenAI
            openaiWs.send(message);
        }
    });

    // 4. Proxy messages from OpenAI back to our client
    openaiWs.on('message', (message) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            // Forward the message directly back to the client
            clientWs.send(message);
        }
    });

    // 5. Handle connection lifecycle
    openaiWs.on('open', () => {
        console.log('Proxy connection to OpenAI established.');
    });

    openaiWs.on('close', (code, reason) => {
        console.log(`Proxy connection to OpenAI closed: ${reason} (${code})`);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1000, 'Upstream service disconnected.');
        }
    });

    openaiWs.on('error', (error) => {
        console.error('Proxy connection to OpenAI error:', error.message);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1011, 'Upstream service error.');
        }
    });

    clientWs.on('close', (code, reason) => {
        console.log(`Client connection closed: ${reason} (${code})`);
        if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.close(1000, 'Client disconnected.');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});