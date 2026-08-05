const admin = require('firebase-admin');

let firebaseApp = null;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : null;

    const isRealPrivateKey = privateKey && privateKey.length > 100 && !privateKey.includes('your_private_key') && !privateKey.includes('\nKEY\n');

    if (projectId && clientEmail && isRealPrivateKey) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      console.log('Firebase credentials not set in .env - Running with simulated phone auth helper');
    }
  } catch (error) {
    console.warn(`Firebase initialization warning: ${error.message}`);
  }

  return firebaseApp;
};

module.exports = { initFirebase, admin };
