
// Firebase configuration utility
let firebaseApp = null;
let firebaseAuth = null;

export async function getFirebaseApp() {
  if (!firebaseApp) {
    await initializeFirebase();
  }
  return firebaseApp;
}

export async function getFirebaseAuth() {
  if (!firebaseAuth) {
    await initializeFirebase();
  }
  return firebaseAuth;
}

async function initializeFirebase() {
  if (firebaseApp) return;
  
  try {
    const response = await fetch('/api/firebase-config');
    const firebaseConfig = await response.json();
    
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js');
    
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Initialize Firebase immediately
initializeFirebase();
