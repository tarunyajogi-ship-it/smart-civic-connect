// Firebase Client Configuration
// REPLACE these placeholders with your actual Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyC2KSnllBgzC7f8mRKP0l3v6H8gPUHoXCU",
  authDomain: "smart-civic-connect-c9c57.firebaseapp.com",
  projectId: "smart-civic-connect-c9c57",
  storageBucket: "smart-civic-connect-c9c57.firebasestorage.app",
  messagingSenderId: "681759563502",
  appId: "1:681759563502:web:4d512165f3f72f19159dff",
  measurementId: "G-8W2SHMNFT8"
};

// Google Maps Javascript API Key
// REPLACE this placeholder with your actual Google Maps API Key
const googleMapsApiKey = "AIzaSyBRfk5sc0TiUXjMg29URTWf_nUuWN-UD5k";

// Flask Backend REST API URL (Auto-detects local vs production deployed URL)
const BACKEND_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:5000"
    : "https://smart-civic-connect-backend.onrender.com"; // Replace with your actual Render/Railway backend URL after deployment

// Helper function to check if configuration placeholders are still in use
function isConfigured() {
  return firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && 
         googleMapsApiKey !== "YOUR_GOOGLE_MAPS_API_KEY";
}
