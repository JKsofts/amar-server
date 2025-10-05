require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const url = require('url');

const { admin, db } = require('./src/firebase');
const { getGptResponse } = require('./src/gpt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', async (ws, req) => {
  const { query } = url.parse(req.url, true);
  const token = query.token;

  if (!token) {
    console.log('Connection rejected: Missing token.');
    ws.close(1008, 'Authentication failed: Token not provided.');
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    console.log(`Client connected and authenticated with UID: ${uid}`);

    ws.on('message', async (message) => {
      try {
        const userQuery = message.toString();
        console.log(`Received query from ${uid}: ${userQuery}`);

        // Process the query with GPT
        const gptResponse = await getGptResponse(userQuery);
        ws.send(JSON.stringify({ type: 'gpt-response', data: gptResponse }));

        // If the query is about finding a partner, search Firestore
        if (userQuery.toLowerCase().includes('partner')) {
          // A more robust way to extract expertise. A real solution could use NLP.
          const expertiseMatch = userQuery.match(/partner with expertise in (.*)/i);
          const expertise = expertiseMatch ? expertiseMatch[1].trim() : "";

          if (expertise) {
            const searchExpertise = expertise.toLowerCase();
            console.log(`Searching for partners with expertise (case-insensitive): ${searchExpertise}`);
            const partnersRef = db.collection('Partners');

            // Use the pre-computed lowercase field for a case-insensitive search.
            const snapshot = await partnersRef.where('expertise_lowercase', '==', searchExpertise).get();

            if (snapshot.empty) {
              console.log('No matching partners found.');
              ws.send(JSON.stringify({ type: 'partner-search-results', data: [] }));
            } else {
                const partners = [];
                snapshot.forEach(doc => {
                  partners.push({ id: doc.id, ...doc.data() });
                });
                console.log(`Found ${partners.length} partner(s).`);
                ws.send(JSON.stringify({ type: 'partner-search-results', data: partners }));
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', data: 'An error occurred while processing your request.' }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${uid}`);
    });

  } catch (error) {
    console.error('Authentication failed:', error.message);
    ws.close(1008, 'Authentication failed');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});