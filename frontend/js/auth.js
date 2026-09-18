// Shared Authentication and Firebase Initialization Script

let app, auth, db, storage;
let firebaseInitialized = false;

// 1. Initialize Firebase if configuration is provided
if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        if (typeof firebase.storage === "function") {
            try { storage = firebase.storage(); } catch (sErr) { console.warn("Firebase Storage unavailable"); }
        }
        firebaseInitialized = true;
        console.log("Firebase Client SDK successfully initialized.");
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("Firebase config placeholders detected. App is running in unconfigured warning mode.");
}

/**
 * Renders a configuration alert if keys are missing
 */
function checkFirebaseConfig() {
    if (!firebaseInitialized) {
        const warningDiv = document.createElement("div");
        warningDiv.className = "container mt-4";
        warningDiv.innerHTML = `
            <div class="setup-warning-banner shadow-sm">
                <h5 class="fw-bold mb-2"><i class="bi bi-exclamation-triangle-fill"></i> Firebase & Google Maps Unconfigured</h5>
                <p class="mb-0 small">
                    The application keys are missing. Please replace the placeholders in 
                    <code>frontend/js/config.js</code> with your actual credentials and place 
                    <code>serviceAccountKey.json</code> in the <code>backend/</code> directory to enable authentication, database, map, and storage features.
                </p>
            </div>
        `;
        document.body.prepend(warningDiv);
    }
}

/**
 * Handle citizen registration
 */
async function registerCitizen(name, email, password, phone) {
    if (!firebaseInitialized) {
        alert("Firebase is not configured yet. Please configure credentials first.");
        return;
    }

    try {
        // 1. Create auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // 2. Create user profile doc in Firestore
        const citizenData = {
            uid: uid,
            name: name,
            email: email,
            role: "citizen",
            department: null,
            phone: phone
        };

        await db.collection("users").doc(uid).set(citizenData);
        console.log("Citizen Firestore profile created.");

        // Redirect to citizen portal
        window.location.href = "citizen.html";
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
}

/**
 * Handle user login (Citizen, Officer, or Admin)
 */
async function loginUser(email, password, expectedRole = null) {
    if (!firebaseInitialized) {
        alert("Firebase is not configured yet. Please configure credentials first.");
        return;
    }

    try {
        // 1. Sign in with Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // 2. Retrieve Firestore document for Role
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            throw new Error("User record not found in database.");
        }

        const userData = userDoc.data();
        const role = userData.role ? userData.role.toLowerCase().trim() : "";

        if (expectedRole && role !== expectedRole.toLowerCase().trim()) {
            console.log(`Portal tab notice: User role is '${role}'. Redirecting to ${role} dashboard.`);
        }

        // 3. Role-based redirect
        if (role === "citizen") {
            window.location.href = "citizen.html";
        } else if (role === "officer") {
            window.location.href = "officer.html";
        } else if (role === "admin") {
            window.location.href = "admin.html";
        } else {
            throw new Error("Invalid role assigned to user.");
        }
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}

/**
 * Sign out of current session
 */
function logoutUser() {
    if (firebaseInitialized) {
        auth.signOut().then(() => {
            window.location.href = "index.html";
        }).catch(err => {
            console.error("Error signing out:", err);
            window.location.href = "index.html";
        });
    } else {
        window.location.href = "index.html";
    }
}

/**
 * Guard page access based on roles
 * @param {Array<string>} allowedRoles Roles authorized to view the page
 */
function guardPage(allowedRoles) {
    document.addEventListener("DOMContentLoaded", () => {
        checkFirebaseConfig();

        if (!firebaseInitialized) {
            // Unconfigured: let them browse layout, but disable forms/submit actions
            disableInteractiveElements();
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Not logged in: redirect to login page
                console.log("No active user session. Redirecting to login...");
                window.location.href = "index.html";
                return;
            }

            try {
                // Fetch user data
                const userDoc = await db.collection("users").doc(user.uid).get();
                if (!userDoc.exists) {
                    console.error("User document not found.");
                    auth.signOut();
                    window.location.href = "index.html";
                    return;
                }

                const userData = userDoc.data();
                const userRole = userData.role ? userData.role.toLowerCase().trim() : "";

                // Check authorization
                if (!allowedRoles.includes(userRole)) {
                    console.warn(`Access forbidden for role '${userRole}'. Redirecting...`);
                    // Redirect to their respective dashboards if they have one
                    if (userRole === "citizen") window.location.href = "citizen.html";
                    else if (userRole === "officer") window.location.href = "officer.html";
                    else if (userRole === "admin") window.location.href = "admin.html";
                    else window.location.href = "index.html";
                } else {
                    // Authorized: call page-specific initialization if available
                    if (typeof initPage === "function") {
                        initPage(userData);
                    }
                }
            } catch (err) {
                console.error("Auth guard check failed:", err);
                auth.signOut();
                window.location.href = "index.html";
            }
        });
    });
}

/**
 * Disables form submits and shows warnings if firebase isn't configured
 */
function disableInteractiveElements() {
    console.warn("Disabling interactive controls due to missing configuration.");
    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            alert("This form submission is disabled because Firebase is not configured yet. Please configure the app in frontend/js/config.js first.");
        });
    });

    // Disable file inputs
    document.querySelectorAll("input[type='file']").forEach(inp => {
        inp.disabled = true;
    });
}

// Automatically check configuration on login page (index.html)
if (window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/")) {
    document.addEventListener("DOMContentLoaded", () => {
        checkFirebaseConfig();

        // If already logged in, redirect away from login page
        if (firebaseInitialized) {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        const userDoc = await db.collection("users").doc(user.uid).get();
                        if (userDoc.exists) {
                            const role = userDoc.data().role;
                            if (role === "citizen") window.location.href = "citizen.html";
                            if (role === "officer") window.location.href = "officer.html";
                            if (role === "admin") window.location.href = "admin.html";
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
        }
    });
}
