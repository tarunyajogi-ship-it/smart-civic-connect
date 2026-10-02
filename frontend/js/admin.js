// Super Admin portal controller

let currentUser = null;
let categoryChart = null;
let statusChart = null;
let adminHeatmap = null;
let heatmapDataPoints = [];
let adminMap = null;

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
 * Entry point called by auth guard
 */
async function initPage(user) {
    currentUser = user;
    
    // Set welcome message
    document.getElementById("welcome-message").innerText = `Logged in as Super Admin: ${currentUser.name} (${currentUser.email})`;
    
    // Toggle department selection based on selected role
    toggleDeptSelection();
    
    // Setup form submit
    setupStaffRegistration();

    // Listen to language changes
    window.addEventListener("languageChanged", () => {
        loadAnalytics();
        loadStaffAndUsers();
        loadEscalatedIssues();
    });

    // Try loading Google Maps API for heatmap
    loadGoogleMapsAPI((success) => {
        if (success) {
            initHeatmap();
        }
    });

    // Initial loads
    loadAnalytics();
    loadStaffAndUsers();
    loadEscalatedIssues();
}

/**
 * Handle tab switching
 */
function switchAdminTab(tabName) {
    document.querySelectorAll(".admin-tab-section").forEach(sec => sec.classList.add("d-none"));
    document.querySelectorAll(".nav-link-custom").forEach(btn => btn.classList.remove("active"));
    
    document.getElementById(`section-${tabName}`).classList.remove("d-none");
    document.getElementById(`tab-${tabName}-btn`).classList.add("active");

    if (tabName === "all-complaints") {
        loadAllComplaintsAdmin();
    }

    // Force map refresh on layout resize
    if (tabName === "dash" && adminMap) {
        google.maps.event.trigger(adminMap, "resize");
    }
}

/**
 * Toggle department field depending on Role choice
 */
function toggleDeptSelection() {
    const role = document.getElementById("staff-role").value;
    const deptContainer = document.getElementById("staff-dept-container");
    const deptSelect = document.getElementById("staff-dept");

    if (role === "admin") {
        deptContainer.classList.add("d-none");
        deptSelect.required = false;
    } else {
        deptContainer.classList.remove("d-none");
        deptSelect.required = true;
    }
}

/**
 * Fetches dashboard and heatmap datasets from Python Flask API
 */
async function loadAnalytics() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/analytics`);
        const result = await response.json();
        
        if (result.status === "success") {
            const data = result.data;
            
            // Populate metrics
            document.getElementById("metric-total").innerText = data.totalComplaints;
            document.getElementById("metric-res-time").innerText = t("res_time_days", { days: data.averageResolutionTimeDays });
            
            const escalatedCount = data.countsByStatus["Escalated"] || 0;
            document.getElementById("metric-escalated").innerText = escalatedCount;
            
            // Build Charts
            buildCategoryChart(data.countsByCategory);
            buildStatusChart(data.countsByStatus);
            
            // If map is active, load heat points
            heatmapDataPoints = data.heatmapPoints || [];
            if (adminMap) {
                renderHeatmapPoints();
            }
        }
    } catch (err) {
        console.error("Failed to load dashboard analytics:", err);
    }
}

/**
 * Build Category Visual Chart
 */
function buildCategoryChart(categoryCounts) {
    const ctx = document.getElementById("categoryChart").getContext("2d");
    if (categoryChart) categoryChart.destroy();

    const labels = Object.keys(categoryCounts).map(k => t(`cat_${k}`));
    const values = Object.values(categoryCounts);

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Complaints by Category',
                data: values,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.65)', // Indigo
                    'rgba(6, 182, 212, 0.65)',  // Cyan
                    'rgba(16, 185, 129, 0.65)', // Emerald
                    'rgba(245, 158, 11, 0.65)',  // Amber
                    'rgba(239, 68, 68, 0.65)',   // Rose
                    'rgba(139, 92, 246, 0.65)'  // Violet
                ],
                borderColor: [
                    '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
                ],
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Build Status Visual Chart
 */
function buildStatusChart(statusCounts) {
    const ctx = document.getElementById("statusChart").getContext("2d");
    if (statusChart) statusChart.destroy();

    const labels = Object.keys(statusCounts).map(k => t(`status_${k}`));
    const values = Object.values(statusCounts);

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3b82f6', // Blue (New)
                    '#8b5cf6', // Violet (Routed)
                    '#f59e0b', // Amber (InProgress)
                    '#10b981', // Emerald (Resolved/Verified)
                    '#ef4444', // Rose (Escalated)
                    '#6b7280'  // Gray (Closed)
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', boxWidth: 12 }
                }
            }
        }
    });
}

/**
 * Initialize Google Maps Heatmap
 */
function initHeatmap() {
    document.getElementById("mock-heatmap").classList.add("d-none");
    
    const centerCoords = { lat: 17.385044, lng: 78.486671 }; // center
    adminMap = new google.maps.Map(document.getElementById("admin-heatmap"), {
        zoom: 13,
        center: centerCoords,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
    });

    renderHeatmapPoints();
}

/**
 * Render heatmap gradient layer
 */
function renderHeatmapPoints() {
    if (!adminMap || heatmapDataPoints.length === 0) return;

    if (adminHeatmap) adminHeatmap.setMap(null);

    const googlePoints = heatmapDataPoints.map(p => {
        return new google.maps.LatLng(p.lat, p.lng);
    });

    adminHeatmap = new google.maps.visualization.HeatmapLayer({
        data: googlePoints,
        map: adminMap,
        radius: 20
    });
}

/**
 * Manual trigger for escalation background checks
 */
async function triggerEscalationJob() {
    const escBtn = document.getElementById("btn-trigger-esc");
    const originalText = escBtn.innerHTML;
    escBtn.disabled = true;
    escBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${t("escalation_checking")}`;

    try {
        // Query param days=0 triggers escalation checks for ALL open complaints immediately (useful for local dev/testing)
        const response = await fetch(`${BACKEND_URL}/api/escalate/trigger?days=0`, {
            method: "POST"
        });
        const result = await response.json();
        
        if (result.status === "success") {
            const count = result.data.escalatedCount;
            showAdminToast(t("escalation_check_success", { count: count }), "success");
            
            // Reload panels
            loadAnalytics();
            loadEscalatedIssues();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (err) {
        console.error("Escalation trigger failed:", err);
        alert("Failed to run escalation check. Check connection to backend.");
    } finally {
        escBtn.disabled = false;
        escBtn.innerHTML = originalText;
    }
}

/**
 * Register a new Officer/Admin via Flask backend using Admin token authentication
 */
function setupStaffRegistration() {
    const form = document.getElementById("staff-register-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("btn-submit-staff");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Submitting...`;

        const name = document.getElementById("staff-name").value;
        const email = document.getElementById("staff-email").value;
        const phone = document.getElementById("staff-phone").value;
        const password = document.getElementById("staff-password").value;
        const role = document.getElementById("staff-role").value;
        const department = role === "officer" ? document.getElementById("staff-dept").value : null;

        try {
            // Get current logged in user token
            let idToken = "";
            if (firebaseInitialized) {
                idToken = await auth.currentUser.getIdToken();
            }

            // POST to register staff REST endpoint
            const response = await fetch(`${BACKEND_URL}/api/users/register-officer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    password: password,
                    role: role,
                    department: department
                })
            });

            const result = await response.json();
            if (result.status === "success") {
                showAdminToast("Staff member registered successfully!", "success");
                form.reset();
                toggleDeptSelection();
                loadStaffAndUsers();
            } else {
                alert(`Registration failed: ${result.message}`);
            }

        } catch (err) {
            console.error("Failed to register staff:", err);
            alert("Connection error. Account registration failed.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

/**
 * Queries and displays registered officers and staff members
 */
async function loadStaffAndUsers() {
    const tbody = document.getElementById("staff-table-body");
    if (!firebaseInitialized) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">Configuration warning: database unconfigured.</td>
            </tr>
        `;
        return;
    }

    try {
        // Query users where role in [officer, admin]
        const snapshot = await db.collection("users")
            .get();

        let staffList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const role = data.role ? data.role.toLowerCase().trim() : "";
            if (role === "officer" || role === "admin") {
                staffList.push(data);
            }
        });

        if (staffList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-3">No staff accounts registered yet.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = "";
        staffList.forEach(item => {
            const tr = document.createElement("tr");
            const deptText = item.department ? t(`dept_${item.department}`) : "--";
            const role = item.role ? item.role.toLowerCase().trim() : "";
            tr.innerHTML = `
                <td class="fw-bold">${item.name}</td>
                <td>${item.email}</td>
                <td><span class="badge bg-secondary">${t(`role_${role}`)}</span></td>
                <td>${deptText}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to load staff profiles:", err);
    }
}

/**
 * Queries and displays all Escalated complaints
 */
async function loadEscalatedIssues() {
    const tbody = document.getElementById("escalated-table-body");
    if (!firebaseInitialized) return;

    try {
        const snapshot = await db.collection("complaints")
            .where("status", "==", "Escalated")
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">No active escalated issues currently reported.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach(doc => {
            const item = doc.data();
            const tr = document.createElement("tr");
            
            const dateVal = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            const ageDays = Math.max(0, Math.floor((new Date() - dateVal) / 86400000));
            
            const translatedCat = t(`cat_${item.category}`);
            const translatedDept = t(`dept_${item.department}`);

            tr.innerHTML = `
                <td class="small text-truncate" style="max-width: 100px;"><code>${item.complaintId}</code></td>
                <td class="fw-bold">${translatedCat}</td>
                <td>${translatedDept}</td>
                <td><span class="badge bg-danger">Level ${item.escalationLevel}</span></td>
                <td>${ageDays} Days</td>
                <td>
                    <button class="btn btn-outline-success btn-xs" onclick="closeEscalated('${item.complaintId}')">
                        <i class="bi bi-check-circle"></i> Resolve
                    </button>
                    <button class="btn btn-outline-light btn-xs ms-1" onclick="viewEscalatedMap(${item.gpsLat}, ${item.gpsLng})">
                        <i class="bi bi-geo-alt"></i> Locate
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to load escalated issues:", err);
    }
}

/**
 * Super Admin Action: Close an escalated issue directly
 */
async function closeEscalated(complaintId) {
    if (!confirm("Are you sure you want to manually resolve and close this escalated issue?")) return;
    try {
        await db.collection("complaints").doc(complaintId).update({
            status: "Closed",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAdminToast("Issue closed successfully.", "success");
        loadAnalytics();
        loadEscalatedIssues();
    } catch (err) {
        console.error("Error closing escalated issue:", err);
    }
}

/**
 * Show escalated point on heatmap
 */
function viewEscalatedMap(lat, lng) {
    switchAdminTab("dash");
    if (adminMap) {
        adminMap.setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
        adminMap.setZoom(17);
    }
}

/**
 * Toast notifications helper
 */
function showAdminToast(message, type = "success") {
    const alertBox = document.getElementById("admin-alert");
    const alertText = document.getElementById("alert-text");
    
    alertBox.className = `alert alert-${type === "success" ? "success" : "warning"} alert-dismissible fade show sticky-top shadow-sm`;
    alertText.innerText = message;
    alertBox.classList.remove("d-none");
    
    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 5000);
}

/**
 * Loads all complaints directory for test data cleanup
 */
async function loadAllComplaintsAdmin() {
    const tbody = document.getElementById("all-complaints-table-body");
    if (!tbody || !firebaseInitialized) return;

    try {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading complaints...</td></tr>`;

        const snapshot = await db.collection("complaints").get();
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No complaints registered in system.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const tr = document.createElement("tr");
            
            const catText = t(`cat_${data.category}`) || data.category;
            const statusText = t(`status_${data.status}`) || data.status;
            
            tr.innerHTML = `
                <td class="small font-monospace text-muted">${id.substring(0, 8)}...</td>
                <td class="fw-bold text-main">${catText}</td>
                <td class="small text-truncate" style="max-width: 200px;" title="${data.description || ''}">${data.description || '--'}</td>
                <td class="small">${data.department || 'General'}</td>
                <td><span class="status-badge status-${data.status ? data.status.toLowerCase() : 'new'}">${statusText}</span></td>
                <td class="fw-semibold text-center">${data.supportCount || 1}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm px-2 py-1 shadow-sm" onclick="deleteComplaintAdmin('${id}')">
                        <i class="bi bi-trash-fill me-1"></i> Delete Test Report
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load all complaints:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error loading complaints: ${err.message}</td></tr>`;
    }
}

/**
 * Deletes a test/invalid complaint document
 */
async function deleteComplaintAdmin(complaintId) {
    if (!confirm(`Are you sure you want to delete test complaint '${complaintId}'? This will remove it from the database.`)) {
        return;
    }

    try {
        let idToken = "";
        if (firebaseInitialized && auth.currentUser) {
            idToken = await auth.currentUser.getIdToken();
        }

        const response = await fetch(`${BACKEND_URL}/api/complaints/${complaintId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${idToken}`
            }
        });

        const result = await response.json();
        if (result.status === "success") {
            showAdminToast("Test complaint deleted successfully!", "success");
            loadAllComplaintsAdmin();
            loadAnalytics();
            loadEscalatedIssues();
        } else {
            alert(`Delete failed: ${result.message}`);
        }
    } catch (err) {
        console.error("Failed to delete complaint:", err);
        alert(`Connection error. Deletion failed.`);
    }
}
