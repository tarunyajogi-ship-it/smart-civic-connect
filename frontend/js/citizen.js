// Citizen portal controller

let currentUser = null;
let currentCoords = { lat: 17.385044, lng: 78.486671 }; // default हैदराबाद coordinates
let submissionMap, nearbyMap;
let submissionMarker;
let nearbyMarkers = [];
let mapsApiLoaded = false;
let activeDuplicateId = null;

// Modal object
let duplicateModal = null;

/**
 * Entry point called by auth guard
 */
async function initPage(user) {
    currentUser = user;
    
    // Set welcome message
    document.getElementById("welcome-message").innerText = `Welcome, ${currentUser.name} (${currentUser.email})`;
    
    // Init modal
    duplicateModal = new bootstrap.Modal(document.getElementById("duplicateModal"));
    
    // Wire up events
    setupPhotoPreview();
    setupFormSubmission();
    setupDuplicateModalEvents();
    
    // Start geolocation capture
    captureLocation();

    // Listen for language changes to update timelines dynamically
    window.addEventListener("languageChanged", () => {
        loadUserComplaints();
        loadNearbyComplaints();
    });

    // Try loading Google Maps API
    loadGoogleMapsAPI((success) => {
        mapsApiLoaded = success;
        if (success) {
            initGoogleMaps();
        } else {
            console.log("Mock Maps mode active.");
            loadNearbyComplaints(); // populate fallback list
        }
    });

    // Load initial complaints
    loadUserComplaints();
}

/**
 * Handle tab switching
 */
function switchTab(tabName) {
    document.querySelectorAll(".tab-section").forEach(sec => sec.classList.add("d-none"));
    document.querySelectorAll(".nav-link-custom").forEach(btn => btn.classList.remove("active"));
    
    document.getElementById(`section-${tabName}`).classList.remove("d-none");
    document.getElementById(`tab-${tabName}-btn`).classList.add("active");

    if (tabName === "map") {
        loadCommunityTrustMap();
    }
}

let leafletSubmissionMap = null;
let leafletSubmissionMarker = null;

/**
 * Captures user coordinates using navigator.geolocation
 */
function captureLocation() {
    const gpsText = document.getElementById("gps-text");
    const gpsSpinner = document.getElementById("gps-spinner");
    const gpsIcon = document.getElementById("gps-icon");
    const coordsPanel = document.getElementById("coordinates-panel");
    const mockCoords = document.getElementById("mock-coords");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentCoords.lat = position.coords.latitude;
                currentCoords.lng = position.coords.longitude;
                
                // Update UI coords
                document.getElementById("val-lat").innerText = currentCoords.lat.toFixed(6);
                document.getElementById("val-lng").innerText = currentCoords.lng.toFixed(6);
                coordsPanel.classList.remove("d-none");
                
                // Update status banner
                gpsSpinner.classList.add("d-none");
                gpsIcon.classList.remove("d-none");
                gpsText.setAttribute("data-i18n", "form_gps_captured");
                gpsText.innerText = t("form_gps_captured");

                if (mockCoords) {
                    mockCoords.innerText = `Lat: ${currentCoords.lat.toFixed(6)}, Lng: ${currentCoords.lng.toFixed(6)}`;
                }

                // Render Leaflet GPS submission map marker
                initLeafletSubmissionMap(currentCoords.lat, currentCoords.lng);
            },
            (error) => {
                console.warn("Geolocation access denied or failed:", error);
                // Switch to default/mock coords
                gpsSpinner.classList.add("d-none");
                gpsIcon.classList.remove("d-none");
                gpsIcon.className = "bi bi-info-circle text-info";
                gpsText.setAttribute("data-i18n", "form_gps_error");
                gpsText.innerText = t("form_gps_error");
                
                // Still show defaults
                document.getElementById("val-lat").innerText = currentCoords.lat.toFixed(6);
                document.getElementById("val-lng").innerText = currentCoords.lng.toFixed(6);
                coordsPanel.classList.remove("d-none");
                if (mockCoords) {
                    mockCoords.innerText = `Lat: ${currentCoords.lat.toFixed(6)}, Lng: ${currentCoords.lng.toFixed(6)} (Default/Simulated)`;
                }

                // Render Leaflet GPS submission map marker with defaults
                initLeafletSubmissionMap(currentCoords.lat, currentCoords.lng);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        gpsSpinner.classList.add("d-none");
        gpsText.innerText = "Browser doesn't support Geolocation.";
        initLeafletSubmissionMap(currentCoords.lat, currentCoords.lng);
    }
}

/**
 * Renders live draggable Leaflet submission map for GPS location selection
 */
function initLeafletSubmissionMap(lat, lng) {
    const container = document.getElementById("leaflet-submission-map");
    if (!container || typeof L === "undefined") return;

    if (!leafletSubmissionMap) {
        container.innerHTML = ""; // Clear spinner loader
        leafletSubmissionMap = L.map("leaflet-submission-map").setView([lat, lng], 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletSubmissionMap);

        const customMarkerIcon = L.divIcon({
            className: "custom-leaflet-submission-pin",
            html: `<div style="background-color: #ef4444; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);"></div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        leafletSubmissionMarker = L.marker([lat, lng], {
            draggable: true,
            icon: customMarkerIcon
        }).addTo(leafletSubmissionMap);

        // Update currentCoords on marker drag
        leafletSubmissionMarker.on("dragend", function (e) {
            const pos = e.target.getLatLng();
            currentCoords.lat = pos.lat;
            currentCoords.lng = pos.lng;
            document.getElementById("val-lat").innerText = currentCoords.lat.toFixed(6);
            document.getElementById("val-lng").innerText = currentCoords.lng.toFixed(6);
        });
    } else {
        leafletSubmissionMap.setView([lat, lng], 15);
        if (leafletSubmissionMarker) {
            leafletSubmissionMarker.setLatLng([lat, lng]);
        }
    }

    setTimeout(() => {
        if (leafletSubmissionMap) leafletSubmissionMap.invalidateSize();
    }, 300);
}

/**
 * Dynamic loader helper for Google Maps JavaScript API
 */
function loadGoogleMapsAPI(callback) {
    if (googleMapsApiKey === "YOUR_FIREBASE_API_KEY" || googleMapsApiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
        callback(false);
        return;
    }

    // Define global callback
    window.initMapsCallback = () => {
        callback(true);
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=visualization&callback=initMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => callback(false);
    document.head.appendChild(script);
}

/**
 * Initialize Google Maps
 */
function initGoogleMaps() {
    // Hide fallbacks
    document.getElementById("mock-submission-map").classList.add("d-none");
    document.getElementById("mock-nearby-map").classList.add("d-none");

    const mapOptions = {
        center: currentCoords,
        zoom: 15,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca53f" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
    };

    // 1. Submission Map
    submissionMap = new google.maps.Map(document.getElementById("submission-map"), mapOptions);
    submissionMarker = new google.maps.Marker({
        position: currentCoords,
        map: submissionMap,
        draggable: true,
        title: "Drag to pin issue location"
    });

    // Listen to drag coordinates
    google.maps.event.addListener(submissionMarker, 'dragend', () => {
        const position = submissionMarker.getPosition();
        currentCoords.lat = position.lat();
        currentCoords.lng = position.lng();
        document.getElementById("val-lat").innerText = currentCoords.lat.toFixed(6);
        document.getElementById("val-lng").innerText = currentCoords.lng.toFixed(6);
    });

    // 2. Nearby Map
    nearbyMap = new google.maps.Map(document.getElementById("nearby-map"), mapOptions);
    
    // Load nearby markers
    loadNearbyComplaints();
}

/**
 * Renders photos when files are loaded
 */
function setupPhotoPreview() {
    const fileInput = document.getElementById("issue-photo");
    const previewContainer = document.getElementById("photo-preview-container");
    const previewImg = document.getElementById("photo-preview");

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                alert("Invalid file type! Please select a valid image file (PNG, JPG, JPEG, or WEBP).");
                fileInput.value = ""; // Clear selection
                previewContainer.classList.add("d-none");
                return;
            }

            // Validate file size (limit to 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                alert("The selected image is too large! Please choose a picture under 10MB.");
                fileInput.value = ""; // Clear selection
                previewContainer.classList.add("d-none");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewContainer.classList.remove("d-none");
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.classList.add("d-none");
        }
    });
}

/**
 * Calculate distance between two GPS coordinates in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

/**
 * Handle form submission
 */
function setupFormSubmission() {
    const form = document.getElementById("report-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const category = document.getElementById("issue-category").value;
        const description = document.getElementById("issue-desc").value;
        
        // 1. Run duplicate check against Firestore active complaints
        const isDuplicate = await checkDuplicateComplaint(category);
        if (isDuplicate) {
            // Modal popup was launched in checkDuplicateComplaint, wait for user input
            return;
        }
        
        // 2. Submit new complaint
        await executeSubmitComplaint();
    });
}

/**
 * Queries Firestore for similar category complaints and checks distance
 * Returns true if a likely duplicate is found.
 */
async function checkDuplicateComplaint(category) {
    if (!firebaseInitialized) return false;
    
    try {
        // Query Firestore for complaints in same category that are not Closed/Verified
        const snapshot = await db.collection("complaints")
            .where("category", "==", category)
            .get();
            
        let duplicateFound = null;
        let minDistance = 100; // Max distance threshold: 100 meters
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const status = data.status;
            
            // Skip closed, verified, or escalated (though maybe check escalated? Typically open issues)
            if (status === "Closed" || status === "Verified") return;
            
            const distance = calculateDistance(
                currentCoords.lat, 
                currentCoords.lng, 
                data.gpsLat, 
                data.gpsLng
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                duplicateFound = data;
            }
        });
        
        if (duplicateFound) {
            // Launch Duplicate Alert Dialog
            activeDuplicateId = duplicateFound.complaintId;
            document.getElementById("duplicate-category").innerText = t(`cat_${duplicateFound.category}`);
            document.getElementById("duplicate-desc").innerText = duplicateFound.description;
            
            const dateStr = duplicateFound.createdAt ? 
                new Date(duplicateFound.createdAt.toDate ? duplicateFound.createdAt.toDate() : duplicateFound.createdAt).toLocaleDateString() : "--";
            document.getElementById("duplicate-date").innerText = `${t("date_reported")}: ${dateStr}`;
            
            if (duplicateFound.photoUrl) {
                document.getElementById("duplicate-photo").src = duplicateFound.photoUrl;
            } else {
                document.getElementById("duplicate-photo").src = "https://picsum.photos/400/300";
            }
            
            duplicateModal.show();
            return true;
        }
        
        return false;
    } catch (err) {
        console.error("Duplicate check query failed:", err);
        return false;
    }
}

/**
 * Wired up button handlers for duplicate alerts
 */
function setupDuplicateModalEvents() {
    // "Report Anyway" - bypass alert and force submission
    document.getElementById("btn-report-anyway-modal").addEventListener("click", async () => {
        duplicateModal.hide();
        await executeSubmitComplaint();
    });

    // "Support Existing Issue" - increment supportCount via backend API
    document.getElementById("btn-support-modal").addEventListener("click", async () => {
        if (!activeDuplicateId) return;
        
        const originalBtnText = document.getElementById("btn-support-modal").innerText;
        document.getElementById("btn-support-modal").disabled = true;
        document.getElementById("btn-support-modal").innerText = t("submitting");
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/complaints/support`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    complaintId: activeDuplicateId,
                    userId: currentUser.uid
                })
            });
            
            const result = await response.json();
            if (result.status === "success") {
                // Success feedback
                showToast(t("support_success"), "success");
                duplicateModal.hide();
                resetReportForm();
                switchTab("track");
                loadUserComplaints();
                loadNearbyComplaints();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (err) {
            console.error("Failed to support complaint:", err);
            alert("Connection error. Could not register support votes.");
        } finally {
            document.getElementById("btn-support-modal").disabled = false;
            document.getElementById("btn-support-modal").innerText = originalBtnText;
            activeDuplicateId = null;
        }
    });
}

/**
 * Helper to compress and encode image to Base64 (to avoid Firebase Storage billing constraints)
 */
function compressAndEncodeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                
                const MAX_SIZE = 800;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64Str = canvas.toDataURL("image/jpeg", 0.7);
                resolve(base64Str);
            };
            img.onerror = (err) => reject(err);
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

/**
 * Handle direct complaint submission and routing
 */
async function executeSubmitComplaint() {
    const submitBtn = document.getElementById("submit-btn");
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${t("submitting")}`;

    const category = document.getElementById("issue-category").value;
    const description = document.getElementById("issue-desc").value;
    const fileInput = document.getElementById("issue-photo");
    const photoFile = fileInput.files[0];

    try {
        let photoUrl = "https://picsum.photos/400/300"; // Fallback placeholder
        
        if (photoFile) {
            // Compress and convert to Base64 locally (No Firebase Storage required!)
            photoUrl = await compressAndEncodeImage(photoFile);
        }

        // Call Flask endpoint to trigger creation & auto-routing logic
        const response = await fetch(`${BACKEND_URL}/api/complaints`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.uid,
                category: category,
                description: description,
                photoUrl: photoUrl,
                gpsLat: currentCoords.lat,
                gpsLng: currentCoords.lng
            })
        });

        const result = await response.json();
        if (result.status === "success") {
            showToast("Complaint submitted and auto-routed successfully!", "success");
            resetReportForm();
            switchTab("track");
            loadUserComplaints();
            loadNearbyComplaints();
        } else if (result.error_type === "category_mismatch" && result.detectedCategory) {
            promptCategoryMismatch(result.message, result.detectedCategory);
        } else {
            alert(`🚫 Not a related image uploaded!\n\n${result.message}\n\nPlease upload a real photo of a civic issue (e.g. potholes, garbage piles, water leakage).`);
        }
    } catch (err) {
        console.error("Submission failed:", err);
        alert("Failed to submit. Please check connection and configuration.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

/**
 * Intimates the citizen of a category mismatch and offers auto-correction
 */
function promptCategoryMismatch(message, detectedCatKey) {
    const detectedCatName = t(`cat_${detectedCatKey}`) || detectedCatKey;
    
    const msgElem = document.getElementById("mismatch-message-text");
    const catElem = document.getElementById("mismatch-detected-cat-name");
    
    if (msgElem) msgElem.innerText = message;
    if (catElem) catElem.innerText = detectedCatName;

    const modalElem = document.getElementById("mismatchModal");
    if (!modalElem) {
        alert(`Category Mismatch: ${message}. Suggested category: ${detectedCatName}`);
        return;
    }

    const modal = new bootstrap.Modal(modalElem);
    const autoCorrectBtn = document.getElementById("btn-auto-correct-category");
    
    if (autoCorrectBtn) {
        const newBtn = autoCorrectBtn.cloneNode(true);
        autoCorrectBtn.parentNode.replaceChild(newBtn, autoCorrectBtn);
        
        newBtn.addEventListener("click", () => {
            modal.hide();
            const select = document.getElementById("issue-category");
            if (select) {
                select.value = detectedCatKey;
            }
            showToast(`Category corrected to '${detectedCatName}'. Submitting complaint...`, "info");
            setTimeout(() => {
                executeSubmitComplaint();
            }, 500);
        });
    }

    modal.show();
}

/**
 * Clear the report form values
 */
function resetReportForm() {
    document.getElementById("report-form").reset();
    document.getElementById("photo-preview-container").classList.add("d-none");
    document.getElementById("photo-preview").src = "#";
}

/**
 * Loads user-specific complaints list
 */
async function loadUserComplaints() {
    const listContainer = document.getElementById("issues-list");
    if (!firebaseInitialized) {
        listContainer.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                <i class="bi bi-info-circle fs-3 mb-2"></i>
                <p>Registering details in configuration mode. Authenticate client configs to load real-time Firestore database.</p>
            </div>
        `;
        return;
    }

    try {
        const snapshot = await db.collection("complaints")
            .where("userId", "==", currentUser.uid)
            .get();

        if (snapshot.empty) {
            listContainer.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-folder2-open fs-2 mb-2"></i>
                    <p data-i18n="no_issues">${t("no_issues")}</p>
                </div>
            `;
            return;
        }

        let complaints = [];
        snapshot.forEach(doc => {
            complaints.push(doc.data());
        });

        // Sort descending by date (in JS to avoid creating Firestore composite index initially)
        complaints.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        });

        listContainer.innerHTML = "";
        complaints.forEach(item => {
            listContainer.appendChild(createComplaintCard(item));
        });

    } catch (err) {
        console.error("Error loading complaints:", err);
        listContainer.innerHTML = `<div class="alert alert-danger">Error loading complaints: ${err.message}</div>`;
    }
}

/**
 * Generate standard HTML elements for tracking card
 */
function createComplaintCard(item) {
    const colDiv = document.createElement("div");
    colDiv.className = "col-12 mb-4";

    const dateStr = item.createdAt ? 
        new Date(item.createdAt.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleString() : "--";
    const updateStr = item.updatedAt ? 
        new Date(item.updatedAt.toDate ? item.updatedAt.toDate() : item.updatedAt).toLocaleString() : "--";
    
    const translatedCategory = t(`cat_${item.category}`);
    const translatedStatus = t(`status_${item.status}`);
    const translatedDepartment = t(`dept_${item.department}`);

    // Map status classes
    const statusClass = `status-${item.status.toLowerCase().replace(" ", "")}`;

    // Timeline steps state
    const steps = ["New", "Routed", "InProgress", "Resolved", "Closed"];
    let currentStepIndex = steps.indexOf(item.status);
    if (item.status === "Verified") currentStepIndex = 4; // Map Verified to Closed/End state
    if (item.status === "Escalated") currentStepIndex = 2; // Keep InProgress timeline active

    let timelineHtml = `<div class="d-flex flex-wrap gap-4 mt-3 mb-4 justify-content-between text-center">`;
    steps.forEach((step, idx) => {
        let stepClass = "text-muted";
        let iconClass = "bi bi-circle";
        
        if (idx < currentStepIndex) {
            stepClass = "text-success";
            iconClass = "bi bi-check-circle-fill";
        } else if (idx === currentStepIndex) {
            stepClass = "text-primary fw-bold";
            iconClass = "bi bi-record-circle-fill";
        }

        timelineHtml += `
            <div class="d-flex flex-column align-items-center flex-grow-1">
                <i class="${iconClass} ${stepClass} fs-4"></i>
                <small class="${stepClass} mt-1">${t(`status_${step}`)}</small>
            </div>
        `;
    });
    timelineHtml += `</div>`;

    // Completion actions if Resolved
    let verificationPromptHtml = "";
    if (item.status === "Resolved") {
        verificationPromptHtml = `
            <div class="alert alert-premium mt-3 p-3">
                <h6 class="fw-bold mb-2"><i class="bi bi-shield-fill-question text-warning me-2"></i>${t("verification_title")}</h6>
                <p class="small text-light mb-3">${t("verification_prompt")}</p>
                
                ${item.resolvedPhotoUrl ? `
                <div class="mb-3">
                    <span class="text-muted small d-block mb-1">Officer completion photo:</span>
                    <img src="${item.resolvedPhotoUrl}" alt="Resolution Proof" class="img-thumbnail bg-dark border-secondary" style="max-height: 150px;">
                </div>` : ''}

                <div class="d-flex gap-2">
                    <button class="btn btn-success btn-sm px-3" onclick="confirmResolution('${item.complaintId}', true)">
                        <i class="bi bi-check2-circle me-1"></i>${t("btn_verify_yes")}
                    </button>
                    <button class="btn btn-outline-danger btn-sm px-3" onclick="confirmResolution('${item.complaintId}', false)">
                        <i class="bi bi-exclamation-octagon me-1"></i>${t("btn_verify_no")}
                    </button>
                </div>
            </div>
        `;
    }

    colDiv.innerHTML = `
        <div class="card bg-dark bg-opacity-20 border-secondary border-opacity-30 rounded-3 text-light h-100 overflow-hidden shadow-sm">
            <div class="row g-0">
                <div class="col-md-3 position-relative" style="min-height: 200px; background: #181d2e;">
                    <img src="${item.photoUrl}" class="w-100 h-100 object-fit-cover absolute-center" alt="${translatedCategory}">
                </div>
                <div class="col-md-9 d-flex flex-column">
                    <div class="card-body p-4 flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                            <div>
                                <span class="status-badge ${statusClass} mb-2 me-2">${translatedStatus}</span>
                                <span class="badge bg-secondary mb-2">${translatedCategory}</span>
                                ${item.escalationLevel > 0 ? `<span class="badge bg-danger mb-2"><i class="bi bi-exclamation-triangle"></i> Esc Level ${item.escalationLevel}</span>` : ""}
                            </div>
                            <small class="text-muted">${t("date_reported")}: ${dateStr}</small>
                        </div>
                        
                        <h5 class="fw-bold mb-2">${translatedCategory}</h5>
                        <p class="card-text text-muted mb-3">${item.description}</p>
                        
                        <div class="row text-muted small g-2 mb-3">
                            <div class="col-sm-6">
                                <i class="bi bi-building me-1"></i>${t("assigned_dept")}: <strong>${translatedDepartment}</strong>
                            </div>
                            <div class="col-sm-6">
                                <i class="bi bi-people me-1"></i>${t("support_count", { count: item.supportCount })}
                            </div>
                            <div class="col-sm-12">
                                <i class="bi bi-geo-alt me-1"></i>GPS Location: <a href="https://www.google.com/maps/search/?api=1&query=${item.gpsLat},${item.gpsLng}" target="_blank" class="text-secondary text-decoration-none">${item.gpsLat.toFixed(4)}, ${item.gpsLng.toFixed(4)} <i class="bi bi-box-arrow-up-right small"></i></a>
                            </div>
                        </div>

                        ${timelineHtml}
                        ${verificationPromptHtml}
                    </div>
                    <div class="card-footer bg-transparent border-top border-secondary border-opacity-20 px-4 py-2">
                        <small class="text-muted">${t("last_updated")}: ${updateStr}</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    return colDiv;
}

/**
 * Handle confirmation (Citizen accepts resolution or escalates)
 */
async function confirmResolution(complaintId, satisfied) {
    if (!firebaseInitialized) return;
    
    try {
        const complaintRef = db.collection("complaints").doc(complaintId);
        
        if (satisfied) {
            // Close the issue
            await complaintRef.update({
                status: "Verified", // or Closed
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast(t("status_updated_verified"), "success");
        } else {
            // Escalate immediately
            const complaintDoc = await complaintRef.get();
            const currentLevel = complaintDoc.data().escalationLevel || 0;
            
            await complaintRef.update({
                status: "Escalated",
                escalationLevel: currentLevel + 1,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast(t("status_updated_escalated"), "warning");
        }
        
        // Reload dashboard
        loadUserComplaints();
        loadNearbyComplaints();
    } catch (err) {
        console.error("Failed to update verification status:", err);
        alert("Failed to confirm. Please check connection.");
    }
}

let leafletTrustMap = null;
let leafletMarkersGroup = null;
let cachedCommunityComplaints = [];
let currentTrustFilter = "All";

/**
 * Loads and renders the interactive Community Trust & Resolution Map
 */
async function loadCommunityTrustMap() {
    if (!firebaseInitialized) return;

    try {
        const snapshot = await db.collection("complaints").get();
        cachedCommunityComplaints = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            cachedCommunityComplaints.push(data);
        });

        // Update counts
        const allCount = cachedCommunityComplaints.length;
        const progressCount = cachedCommunityComplaints.filter(c => c.status === "InProgress").length;
        const resolvedCount = cachedCommunityComplaints.filter(c => ["Resolved", "Verified", "Closed"].includes(c.status)).length;
        const openCount = cachedCommunityComplaints.filter(c => ["New", "Routed"].includes(c.status)).length;

        const elAll = document.getElementById("count-all");
        const elProg = document.getElementById("count-progress");
        const elRes = document.getElementById("count-resolved");
        const elOpen = document.getElementById("count-open");

        if (elAll) elAll.innerText = allCount;
        if (elProg) elProg.innerText = progressCount;
        if (elRes) elRes.innerText = resolvedCount;
        if (elOpen) elOpen.innerText = openCount;

        // Render Leaflet Map
        renderLeafletTrustMap();

        // Render Feed
        renderCommunityTrustFeed();

    } catch (err) {
        console.error("Failed to load community trust map complaints:", err);
    }
}

/**
 * Filter Community Trust Map markers and cards
 */
function filterTrustMap(statusFilter, btn) {
    currentTrustFilter = statusFilter;
    
    // Update active button state
    document.querySelectorAll(".filter-trust-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    renderLeafletTrustMap();
    renderCommunityTrustFeed();
}

/**
 * Renders interactive Leaflet OpenStreetMap with custom colored markers
 */
function renderLeafletTrustMap() {
    const container = document.getElementById("leaflet-trust-map");
    if (!container || typeof L === "undefined") return;

    // Filter complaints based on current selected tab filter
    let itemsToDisplay = cachedCommunityComplaints;
    if (currentTrustFilter === "InProgress") {
        itemsToDisplay = cachedCommunityComplaints.filter(c => c.status === "InProgress");
    } else if (currentTrustFilter === "Resolved") {
        itemsToDisplay = cachedCommunityComplaints.filter(c => ["Resolved", "Verified", "Closed"].includes(c.status));
    } else if (currentTrustFilter === "Routed") {
        itemsToDisplay = cachedCommunityComplaints.filter(c => ["New", "Routed"].includes(c.status));
    }

    const defaultLat = currentCoords ? currentCoords.lat : 17.385044;
    const defaultLng = currentCoords ? currentCoords.lng : 78.486671;

    // Initialize Leaflet map instance if not created yet
    if (!leafletTrustMap) {
        container.innerHTML = ""; // Clear loader
        leafletTrustMap = L.map("leaflet-trust-map").setView([defaultLat, defaultLng], 13);

        // OpenStreetMap Dark/Standard Tile Layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletTrustMap);

        leafletMarkersGroup = L.layerGroup().addTo(leafletTrustMap);
    } else {
        leafletMarkersGroup.clearLayers();
    }

    // Helper for marker color icons
    const createCustomPinIcon = (colorHex) => {
        return L.divIcon({
            className: "custom-leaflet-pin",
            html: `<div style="background-color: ${colorHex}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    };

    const yellowIcon = createCustomPinIcon("#f59e0b"); // In Progress
    const greenIcon = createCustomPinIcon("#10b981");  // Resolved
    const blueIcon = createCustomPinIcon("#3b82f6");   // Routed / New

    const boundsGroup = [];

    // Add markers
    itemsToDisplay.forEach(item => {
        if (!item.gpsLat || !item.gpsLng) return;

        let pinIcon = blueIcon;
        if (item.status === "InProgress") pinIcon = yellowIcon;
        if (["Resolved", "Verified", "Closed"].includes(item.status)) pinIcon = greenIcon;

        const catName = t(`cat_${item.category}`) || item.category;
        const statusName = t(`status_${item.status}`) || item.status;

        const popupContent = `
            <div class="text-dark p-2" style="max-width: 260px;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="fw-bold">${catName}</strong>
                    <span class="badge ${item.status === 'Resolved' ? 'bg-success' : (item.status === 'InProgress' ? 'bg-warning text-dark' : 'bg-primary')}">${statusName}</span>
                </div>
                <p class="small text-muted mb-2 text-truncate">${item.description}</p>
                <img src="${item.resolvedPhotoUrl || item.photoUrl}" class="img-thumbnail w-100 object-fit-cover mb-2" style="height: 110px;">
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted"><i class="bi bi-heart-fill text-danger me-1"></i>${item.supportCount || 1} Upvotes</small>
                    <button class="btn btn-primary btn-xs py-1 px-2" onclick="upvoteNearby('${item.complaintId}')">
                        <i class="bi bi-arrow-up-circle me-1"></i>Upvote
                    </button>
                </div>
            </div>
        `;

        L.marker([item.gpsLat, item.gpsLng], { icon: pinIcon })
            .bindPopup(popupContent)
            .addTo(leafletMarkersGroup);

        boundsGroup.push([item.gpsLat, item.gpsLng]);
    });

    if (boundsGroup.length > 0 && leafletTrustMap) {
        leafletTrustMap.fitBounds(boundsGroup, { maxZoom: 15, padding: [30, 30] });
    } else if (leafletTrustMap) {
        leafletTrustMap.setView([defaultLat, defaultLng], 13);
    }

    // Invalidate map size to handle hidden tab transitions
    setTimeout(() => {
        if (leafletTrustMap) leafletTrustMap.invalidateSize();
    }, 300);
}

/**
 * Renders the Community Reports & Resolution Activity Feed
 */
function renderCommunityTrustFeed() {
    const feedContainer = document.getElementById("community-trust-feed");
    if (!feedContainer) return;

    let itemsToDisplay = cachedCommunityComplaints;
    if (currentTrustFilter === "InProgress") {
        itemsToDisplay = cachedCommunityComplaints.filter(c => c.status === "InProgress");
    } else if (currentTrustFilter === "Resolved") {
        itemsToDisplay = cachedCommunityComplaints.filter(c => ["Resolved", "Verified", "Closed"].includes(c.status));
    } else if (currentTrustFilter === "Routed") {
        itemsToDisplay = cachedCommunityComplaints.filter(c => ["New", "Routed"].includes(c.status));
    }

    if (itemsToDisplay.length === 0) {
        feedContainer.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                <i class="bi bi-info-circle fs-3 mb-2"></i>
                <p class="mb-0">No community complaints found under '${currentTrustFilter}' status.</p>
            </div>
        `;
        return;
    }

    feedContainer.innerHTML = "";
    itemsToDisplay.forEach(item => {
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4 mb-3";

        const catName = t(`cat_${item.category}`) || item.category;
        const statusName = t(`status_${item.status}`) || item.status;
        const statusClass = `status-${item.status.toLowerCase().replace(" ", "")}`;

        col.innerHTML = `
            <div class="card bg-dark bg-opacity-30 border-secondary border-opacity-25 text-light h-100 shadow-sm">
                <div class="card-body p-3 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="status-badge ${statusClass} scale-90">${statusName}</span>
                        <span class="badge bg-secondary opacity-75">${catName}</span>
                    </div>
                    <h6 class="fw-bold mb-1">${catName}</h6>
                    <p class="card-text small text-muted text-truncate mb-2">${item.description}</p>
                    
                    <div class="position-relative mb-3 rounded overflow-hidden" style="height: 140px; background: #121624;">
                        <img src="${item.resolvedPhotoUrl || item.photoUrl}" class="w-100 h-100 object-fit-cover" alt="${catName}">
                        ${item.status === 'Resolved' || item.status === 'Verified' ? `
                            <span class="position-absolute top-0 end-0 bg-success text-white small px-2 py-1 m-2 rounded shadow-sm fw-bold">
                                <i class="bi bi-check-circle-fill me-1"></i>Fixed Proof
                            </span>
                        ` : ''}
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <small class="text-muted"><i class="bi bi-people me-1"></i>${item.supportCount || 1} Upvotes</small>
                        <button class="btn btn-premium-secondary btn-sm py-1 px-3 rounded-pill font-xs" onclick="upvoteNearby('${item.complaintId}')">
                            <i class="bi bi-arrow-up-circle-fill me-1"></i>Upvote
                        </button>
                    </div>
                </div>
            </div>
        `;
        feedContainer.appendChild(col);
    });
}

/**
 * Handle upvoting directly from fallback lists / community trust map
 */
async function upvoteNearby(complaintId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/complaints/support`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                complaintId: complaintId,
                userId: currentUser.uid
            })
        });
        
        const result = await response.json();
        if (result.status === "success") {
            showToast(t("support_success"), "success");
            loadNearbyComplaints();
            loadUserComplaints();
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * Toast notification popup utility
 */
function showToast(message, type = "success") {
    const alertBox = document.getElementById("citizen-alert");
    const alertText = document.getElementById("alert-text");
    
    alertBox.className = `alert alert-${type === "success" ? "success" : "warning"} alert-dismissible fade show sticky-top shadow-sm`;
    alertText.innerText = message;
    alertBox.classList.remove("d-none");
    
    // Auto hide
    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 5000);
}
