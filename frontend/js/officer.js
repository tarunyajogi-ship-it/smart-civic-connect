// Officer portal controller

let currentUser = null;
let currentFilter = "Routed"; // Routed (New), InProgress, Resolved
let resolveModal = null;

/**
 * Entry point called by auth guard
 */
async function initPage(user) {
    currentUser = user;
    
    // Set welcome message and department badge
    document.getElementById("welcome-message").innerText = `Logged in as Officer: ${currentUser.name} (${currentUser.email})`;
    
    const deptText = t(`dept_${currentUser.department}`);
    document.getElementById("dept-badge").innerHTML = `<i class="bi bi-building me-1"></i> ${t("officer_dept", { dept: deptText })}`;
    
    // Init modal
    resolveModal = new bootstrap.Modal(document.getElementById("resolveModal"));
    
    // Setup file preview and form submit
    setupResolvePreview();
    setupResolveSubmission();
    
    // Listen for language changes to update translations
    window.addEventListener("languageChanged", () => {
        const dText = t(`dept_${currentUser.department}`);
        document.getElementById("dept-badge").innerHTML = `<i class="bi bi-building me-1"></i> ${t("officer_dept", { dept: dText })}`;
        loadOfficerComplaints();
    });

    // Load complaints
    loadOfficerComplaints();
}

/**
 * Handle tab navigation filter changes
 */
function switchFilter(filterName) {
    currentFilter = filterName;
    document.querySelectorAll(".nav-link-custom").forEach(btn => btn.classList.remove("active"));
    
    if (filterName === "Routed") {
        document.getElementById("tab-new-btn").classList.add("active");
    } else if (filterName === "InProgress") {
        document.getElementById("tab-progress-btn").classList.add("active");
    } else if (filterName === "Resolved") {
        document.getElementById("tab-resolved-btn").classList.add("active");
    }
    
    loadOfficerComplaints();
}

/**
 * Queries and lists complaints assigned to this officer's department
 */
async function loadOfficerComplaints() {
    const listContainer = document.getElementById("officer-complaints-list");
    if (!firebaseInitialized) {
        listContainer.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                <i class="bi bi-info-circle fs-3 mb-2"></i>
                <p>Running in configuration warning mode. Authenticate client configs to load real-time Firestore database.</p>
            </div>
        `;
        return;
    }

    try {
        let query = db.collection("complaints")
            .where("department", "==", currentUser.department);

        // Apply filters
        if (currentFilter === "Routed") {
            query = query.where("status", "==", "Routed");
        } else if (currentFilter === "InProgress") {
            // Only show complaints claimed by this specific officer
            query = query.where("status", "==", "InProgress")
                         .where("assignedOfficerId", "==", currentUser.uid);
        } else if (currentFilter === "Resolved") {
            // Show resolved, verified, closed, or escalated issues assigned to this officer/dept
            // We fetch all other active department complaints and filter client-side to avoid Firestore composite index errors
        }

        const snapshot = await query.get();
        let complaints = [];
        
        snapshot.forEach(doc => {
            complaints.push(doc.data());
        });

        // Client side filtering for history tab (Resolved, Verified, Closed, Escalated)
        if (currentFilter === "Resolved") {
            complaints = complaints.filter(item => ["Resolved", "Verified", "Closed", "Escalated"].includes(item.status));
        }

        // Sort descending by date
        complaints.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        });

        if (complaints.length === 0) {
            listContainer.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-folder2-open fs-2 mb-2"></i>
                    <p>No complaints found in this category.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = "";
        complaints.forEach(item => {
            listContainer.appendChild(createOfficerComplaintCard(item));
        });

    } catch (err) {
        console.error("Error loading complaints for officer:", err);
        listContainer.innerHTML = `<div class="alert alert-danger col-12">Error loading complaints: ${err.message}</div>`;
    }
}

/**
 * Generate standard HTML elements for officer cards
 */
function createOfficerComplaintCard(item) {
    const colDiv = document.createElement("div");
    colDiv.className = "col-12 mb-4";

    const dateStr = item.createdAt ? 
        new Date(item.createdAt.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleString() : "--";
    
    const translatedCategory = t(`cat_${item.category}`);
    const translatedStatus = t(`status_${item.status}`);
    const statusClass = `status-${item.status.toLowerCase().replace(" ", "")}`;

    // Conditional action buttons
    let actionButtonsHtml = "";
    if (item.status === "Routed") {
        actionButtonsHtml = `
            <button class="btn btn-premium btn-sm mt-3" onclick="claimComplaint('${item.complaintId}')">
                <i class="bi bi-play-circle me-1"></i>${t("btn_start_progress")}
            </button>
        `;
    } else if (item.status === "InProgress") {
        actionButtonsHtml = `
            <button class="btn btn-premium-secondary btn-sm mt-3" onclick="triggerResolveModal('${item.complaintId}')">
                <i class="bi bi-check-circle me-1"></i>${t("btn_resolve_issue")}
            </button>
        `;
    }

    // Resolution details
    let resolutionDetailHtml = "";
    if (item.status === "Resolved" || item.status === "Verified" || item.status === "Closed") {
        resolutionDetailHtml = `
            <div class="mt-3 p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-20">
                <span class="text-muted small d-block mb-2">Resolution Proof:</span>
                ${item.resolvedPhotoUrl ? `<img src="${item.resolvedPhotoUrl}" class="img-thumbnail bg-dark border-secondary" style="max-height: 150px;">` : ""}
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
                            </div>
                            <small class="text-muted">${t("date_reported")}: ${dateStr}</small>
                        </div>
                        
                        <h5 class="fw-bold mb-2">${translatedCategory}</h5>
                        <p class="card-text text-muted mb-3">${item.description}</p>
                        
                        <div class="row text-muted small g-2 mb-3">
                            <div class="col-sm-6">
                                <i class="bi bi-people me-1"></i>${t("support_count", { count: item.supportCount })}
                            </div>
                            <div class="col-sm-6">
                                <i class="bi bi-geo-alt me-1"></i>GPS Coordinates: 
                                <a href="https://www.google.com/maps/search/?api=1&query=${item.gpsLat},${item.gpsLng}" target="_blank" class="text-secondary text-decoration-none">
                                    ${item.gpsLat.toFixed(4)}, ${item.gpsLng.toFixed(4)} <i class="bi bi-box-arrow-up-right small"></i>
                                </a>
                            </div>
                        </div>

                        ${actionButtonsHtml}
                        ${resolutionDetailHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    return colDiv;
}

/**
 * Claims a complaint (moves status to InProgress and assigns to officer)
 */
async function claimComplaint(complaintId) {
    if (!firebaseInitialized) return;
    
    try {
        await db.collection("complaints").doc(complaintId).update({
            status: "InProgress",
            assignedOfficerId: currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast("Claimed issue successfully. Started working!", "success");
        loadOfficerComplaints();
    } catch (err) {
        console.error(err);
        alert("Failed to start work: " + (err.message || err));
    }
}

/**
 * Triggers the resolution modal
 */
function triggerResolveModal(complaintId) {
    document.getElementById("resolve-complaint-id").value = complaintId;
    document.getElementById("resolve-form").reset();
    document.getElementById("resolve-preview-container").classList.add("d-none");
    resolveModal.show();
}

/**
 * Handle resolved photo preview
 */
function setupResolvePreview() {
    const fileInput = document.getElementById("resolve-photo");
    const previewContainer = document.getElementById("resolve-preview-container");
    const previewImg = document.getElementById("resolve-preview");

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
 * Handle resolution form submission
 */
function setupResolveSubmission() {
    const form = document.getElementById("resolve-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const complaintId = document.getElementById("resolve-complaint-id").value;
        const fileInput = document.getElementById("resolve-photo");
        const photoFile = fileInput.files[0];
        const submitBtn = document.getElementById("btn-submit-resolution");

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${t("resolving")}`;

        try {
            let photoUrl = "https://picsum.photos/400/300"; // default mock resolution photo
            
            if (photoFile) {
                // Compress and convert to Base64 locally (No Firebase Storage required!)
                photoUrl = await compressAndEncodeImage(photoFile);
            }

            // Update complaint status to Resolved
            if (firebaseInitialized) {
                await db.collection("complaints").doc(complaintId).update({
                    status: "Resolved",
                    resolvedPhotoUrl: photoUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            showToast("Issue resolved! Awaiting citizen verification.", "success");
            resolveModal.hide();
            loadOfficerComplaints();
        } catch (err) {
            console.error("Resolution submit failed:", err);
            alert("Failed to submit resolution. Check network connection.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

/**
 * Toast notifications
 */
function showToast(message, type = "success") {
    const alertBox = document.getElementById("officer-alert");
    const alertText = document.getElementById("alert-text");
    
    alertBox.className = `alert alert-${type === "success" ? "success" : "warning"} alert-dismissible fade show sticky-top shadow-sm`;
    alertText.innerText = message;
    alertBox.classList.remove("d-none");
    
    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 5000);
}
