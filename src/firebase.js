const admin = require('firebase-admin');

// Note: dotenv should be configured in the application's entry point (server.js),
// not in a library module.

// Check if FIREBASE_CREDENTIALS is set
if (!process.env.FIREBASE_CREDENTIALS) {
  throw new Error('FIREBASE_CREDENTIALS environment variable is not set. Please ensure .env file is configured correctly.');
}

let serviceAccount;
try {
  // The FIREBASE_CREDENTIALS variable should be the string content of the service account JSON key file
  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} catch (error) {
    console.error("Failed to parse FIREBASE_CREDENTIALS. Ensure it is a valid, single-line JSON string in your .env file.", error);
    throw new Error('Failed to parse FIREBASE_CREDENTIALS.');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db };