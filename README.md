# Smart Civic Connect

Smart Civic Connect is a civic issue reporting and resolution platform designed for municipal corporations and gram panchayats. It enables citizens to report local issues with auto-captured geolocation and image proof, automatically routes issues to the correct government departments, alerts citizens to duplicate reports, and provides workflows for officers to resolve and admins to audit civic issues.

---

## 🛠️ Tech Stack & Key Features

- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JavaScript.
- **Backend**: Python Flask (REST APIs, routing, and escalation engine).
- **Authentication & Database**: Firebase Authentication and Cloud Firestore (No credit card or billing details required; runs on the free Spark plan).
- **Local Image Compression**: Bypasses Firebase Storage constraints by compressing images locally via HTML5 canvas and converting them to Base64 data strings under 100KB, storing them directly in Firestore.
- **Camera Capture Enforcement**: Uses `capture="camera"` on file inputs, forcing mobile devices to take live photos on-site instead of choosing old/fake gallery photos.
- **AI Image Content Validation**: Integrates Google Gemini API (`gemini-1.5-flash`) on the backend to verify that uploaded images are real-world civic issues and match their selected category (e.g. rejecting a pothole photo if categorized as "Garbage Heap").


---

## 📂 Project Structure

```
smart-civic-connect/
├── backend/
│   ├── app.py                      # Flask Server (REST Endpoints & AI Validation)
│   ├── config.py                   # Backend Configuration
│   ├── requirements.txt            # Python dependencies (includes Pillow, google-generativeai)
│   ├── test_api.py                 # Backend integration test script
│   └── serviceAccountKey.json      # Firebase Admin Key (Generated in Step 2)
├── frontend/
│   ├── css/
│   │   └── style.css               # Application stylesheet
│   ├── images/
│   │   └── civic_connect_banner.jpg # Smart City visual illustration
│   ├── js/
│   │   ├── config.js               # Client Configuration (Credentials)
│   │   ├── auth.js                 # User state and case-insensitive guards
│   │   ├── citizen.js              # Citizen portal actions & local image compressor
│   │   ├── officer.js              # Officer portal actions & resolution compiler
│   │   ├── admin.js                # Super Admin dashboard actions & Chart.js loaders
│   │   └── i18n.js                 # Translation resources & toggle helper
│   ├── index.html                  # Split-screen Login / Citizen Register Page
│   ├── citizen.html                # Citizen dashboard
│   ├── officer.html                # Officer dashboard
│   └── admin.html                  # Super Admin dashboard
└── README.md                       # Documentation & guidelines
```

---

## 🚀 Setup Instructions

### Step 1: Firebase Project Setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**. Name it `smart-civic-connect`.
2. **Enable Authentication**:
   - Go to **Build** &rarr; **Authentication** &rarr; **Get Started**.
   - Under the **Sign-in method** tab, enable **Email/Password** provider.
3. **Enable Firestore Database**:
   - Go to **Build** &rarr; **Firestore Database** &rarr; **Create Database**.
   - Select your database location and start in **Production mode**.
4. **Register Web App**:
   - On the Project Overview page, click the **Web icon** (`</>`) to register a new web app.
   - Name it `Smart Civic Connect Web`.
   - Copy the `firebaseConfig` object containing `apiKey`, `authDomain`, etc.
   - Open `frontend/js/config.js` and paste these keys into the `firebaseConfig` object.

*(Note: Setting up Firebase Storage is completely optional and skipped, as images are processed locally and stored in Firestore).*

### Step 2: Generate Service Account Key (Backend credentials)

1. In the Firebase Console, go to **Project Settings** (gear icon) &rarr; **Service accounts** tab.
2. Click **Generate new private key** at the bottom of the screen.
3. Save the downloaded JSON file as `serviceAccountKey.json` inside the `backend/` directory.

### Step 3: Google Maps API Integration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select your project, go to **APIs & Services** &rarr; **Library**.
3. Enable **Maps JavaScript API**.
4. Go to **APIs & Services** &rarr; **Credentials** and click **Create Credentials** &rarr; **API key**.
5. Copy your API Key, open `frontend/js/config.js`, and replace `"YOUR_GOOGLE_MAPS_API_KEY"` with it.

### Step 4: Google Gemini API Integration (Optional - AI Image Verification)

1. Go to **[Google AI Studio](https://aistudio.google.com/)** and log in.
2. Click the **Get API key** button and click **Create API key**.
3. Copy the key, open `backend/config.py`, and set the `GEMINI_API_KEY` configuration variable.

---

## 🔒 Firebase Security Rules

Configure these rules in your Firebase Console to secure your Firestore database.

### Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profile permissions
    match /users/{userId} {
      // Citizens can read/write their own profile. Officers/Admins can read profiles.
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Complaints permissions
    match /complaints/{complaintId} {
      // Authenticated users can read complaints
      allow read: if request.auth != null;
      
      // Citizens can create complaints and update their own submissions (such as upvoting or confirming verification)
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

---

## 💻 Running the Application Locally

### 1. Running the Flask Backend

Open PowerShell or Command Prompt, navigate to the backend directory, and execute:

```powershell
# Navigate to backend
cd backend

# Create a virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies (Flask, Pillow, google-generativeai, etc.)
pip install -r requirements.txt

# Run backend development server (starts on http://127.0.0.1:5000)
python app.py
```

### 2. Running the Frontend Client

The frontend can be loaded directly in your browser. Double-click `frontend/index.html` or host it with a simple web server:

```powershell
# Navigate to frontend
cd frontend

# Run simple local server (requires Python)
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

---

## ⚙️ Core Workflows

### 1. Duplicate Checks
Before a citizen submits a complaint, the frontend queries Firestore database. If an active complaint of the same category is found within 100 meters, it opens an upvote dialog:
- **Upvote**: Increments `supportCount` of the duplicate complaint on the backend `/api/complaints/support`.
- **Submit anyway**: Submits a new distinct issue.

### 2. AI Content Checking
If `GEMINI_API_KEY` is configured in `backend/config.py`:
- The backend will decode the photo and pass it to the Gemini vision API.
- If the image contains no municipal problems (e.g. an ER diagram or diagram screenshot) or matches the wrong category (e.g., pothole photo reported under "Garbage Heap"), the submission is rejected.

### 3. Escalations
If an issue is not resolved within 7 days, it will be flagged.
- For local testing, clicking the **Run Escalation Check** button on the Super Admin panel will query the Flask `/api/escalate/trigger?days=0` endpoint, which overrides the 7-day filter to 0 days, immediately escalating any open complaints to facilitate developer verification.
- Bumps `escalationLevel` by 1 and moves status to `"Escalated"`.

### 4. Verification and Close
Once an officer marks an issue as `"Resolved"`, the citizen receives a card prompt under "Track My Issues" to verify.
- **Yes, Close**: Updates status to `"Verified"`.
- **No, Escalate**: Instantly updates status to `"Escalated"`.

---

## 🧪 Integration Tests

You can run automated test suites to verify Flask routing and fallbacks:
```powershell
cd backend
python test_api.py
```
*(Note: If `serviceAccountKey.json` is missing, tests will verify that status code responses fallback to 503 instead of crashing).*
