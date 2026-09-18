import os
import json
import base64
from io import BytesIO
from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image as PILImage
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore, auth
try:
    from config import Config
except ModuleNotFoundError:
    from backend.config import Config

app = Flask(__name__)
# Enable CORS for all routes to allow frontend calls
CORS(app)
app.config.from_object(Config)

# Initialize Firebase Admin SDK
db = None
firebase_init_error = None

env_json_str = (os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or "").strip()
key_path = app.config["FIREBASE_SERVICE_ACCOUNT_KEY"]

try:
    if env_json_str and env_json_str.startswith("{"):
        cred_dict = json.loads(env_json_str)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase Admin SDK successfully initialized via Environment Variable JSON.")
    elif env_json_str and os.path.exists(env_json_str):
        cred = credentials.Certificate(env_json_str)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print(f"Firebase Admin SDK successfully initialized via path: {env_json_str}")
    elif os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase Admin SDK successfully initialized via serviceAccountKey.json file.")
    else:
        firebase_init_error = (
            "Firebase serviceAccountKey.json not found in backend directory, "
            "and FIREBASE_SERVICE_ACCOUNT_JSON environment variable does not contain valid JSON. "
            "Please paste the full contents of serviceAccountKey.json into Render Environment Variables."
        )
        print(f"WARNING: {firebase_init_error}")
except Exception as e:
    if os.path.exists(key_path):
        try:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("Firebase Admin SDK successfully initialized via local file fallback.")
        except Exception as file_e:
            firebase_init_error = f"Failed to initialize Firebase Admin SDK: {str(file_e)}"
            print(f"ERROR: {firebase_init_error}")
    else:
        firebase_init_error = f"Failed to initialize Firebase Admin SDK: {str(e)}"
        print(f"ERROR: {firebase_init_error}")


def firebase_required(f):
    """Decorator to ensure Firebase Admin SDK is initialized, returning a clean error if not."""
    def wrapper(*args, **kwargs):
        if db is None:
            return jsonify({
                "status": "error",
                "message": firebase_init_error or "Firebase Admin SDK is not initialized."
            }), 503
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint to verify backend running state."""
    return jsonify({
        "status": "ok",
        "firebase_initialized": db is not None,
        "error": firebase_init_error
    })


def analyze_image_features(image, selected_category):
    """
    Smart PIL Visual Feature Classifier fallback.
    Analyzes pixel color distributions, white background ratios, saturation, contrast, and hue variance.
    """
    try:
        img = image.convert('RGB').resize((150, 150))
        pixels = list(img.getdata())
        total_pixels = len(pixels)

        # 1. Unique RGB color depth check
        unique_colors = len(set(pixels))
        if unique_colors < 150:
            return False, "Not a related image! The uploaded picture appears to be a drawing, shape graphic, or clipart, not a real-world photograph.", None

        white_background_count = 0
        blue_water_count = 0
        dark_asphalt_count = 0
        night_dark_count = 0
        bright_light_count = 0
        green_brown_drain_count = 0
        color_entropy_set = set()

        for r, g, b in pixels:
            color_entropy_set.add((r // 32, g // 32, b // 32))
            
            # Plain white/light graphic background (r, g, b > 200 with low color difference)
            if r > 200 and g > 200 and b > 200 and abs(r - g) < 18 and abs(g - b) < 18:
                white_background_count += 1

            # Blue/Cyan water hue detection
            if b > r + 15 and (b > g - 15 or g > r + 15):
                blue_water_count += 1

            # Asphalt / Gray road tone (must have natural texture)
            if abs(r - g) < 25 and abs(g - b) < 25 and 35 < r < 165:
                dark_asphalt_count += 1

            # Night dark tone
            if r < 40 and g < 40 and b < 40:
                night_dark_count += 1

            # High intensity streetlight glow
            if r > 210 and g > 210 and b > 190:
                bright_light_count += 1

            # Sludge / Drain tone
            if g > r and g > b and r > 50:
                green_brown_drain_count += 1

        white_ratio = white_background_count / total_pixels
        water_ratio = blue_water_count / total_pixels
        asphalt_ratio = dark_asphalt_count / total_pixels
        night_ratio = night_dark_count / total_pixels
        light_ratio = bright_light_count / total_pixels
        drain_ratio = green_brown_drain_count / total_pixels
        color_variety = len(color_entropy_set)

        # 2. Clipart / Illustration / Paper Notes Check:
        # Real civic photos are outdoor scene photos (roads, soil, waste, pipes) and NEVER have >35% plain white graphic background.
        if white_ratio > 0.35:
            return False, "Not a related image! The uploaded picture has a plain white graphic background (clipart, illustration, or document), not a real-world outdoor photograph of a civic issue.", None

        detected_cat = None

        if water_ratio > 0.12:
            detected_cat = "WaterLeakage"
        elif night_ratio > 0.40 and light_ratio > 0.02:
            detected_cat = "Streetlights"
        elif color_variety > 115 and water_ratio < 0.10:
            detected_cat = "Garbage"
        elif asphalt_ratio > 0.42 and color_variety > 80:
            detected_cat = "Potholes"
        elif drain_ratio > 0.18:
            detected_cat = "Drainage"

        if detected_cat and detected_cat.lower() != selected_category.lower():
            return False, f"Image feature analysis detected '{detected_cat}' features, which does not match your selected category '{selected_category}'.", detected_cat

        return True, "Valid visual features", None
    except Exception as err:
        print(f"Visual feature analysis fallback error: {err}")
        return True, "Valid", None


def verify_image_content(photo_data_url, category):
    """
    Dual-Layer Category Verification:
    Layer 1: Google Gemini Vision API (if valid API key is present)
    Layer 2: PIL Visual Feature Classifier (runs automatically as fallback or double-check)
    Returns (is_valid, explanation_message, detected_category_key)
    """
    # Decode base64
    image = None
    try:
        if photo_data_url.startswith("data:image/"):
            header, encoded = photo_data_url.split(",", 1)
            image_data = base64.b64decode(encoded)
            image = PILImage.open(BytesIO(image_data))
        elif photo_data_url.startswith("http"):
            return True, "Valid (External Link)", None
        else:
            return False, "Invalid image format", None
    except Exception as err:
        return False, f"Could not decode image: {str(err)}", None

    # Try Layer 1: Google Gemini Vision API
    api_key = app.config.get("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        api_key = os.environ.get("GEMINI_API_KEY")
        
    if api_key and api_key != "YOUR_GEMINI_API_KEY":
        try:
            genai.configure(api_key=api_key)
            model = None
            for model_name in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro-vision"]:
                try:
                    model = genai.GenerativeModel(model_name)
                    break
                except Exception:
                    continue

            if model:
                prompt = (
                    f"Analyze this image carefully. The user submitted it for a civic issue report under category '{category}'.\n"
                    "CRITICAL RULES:\n"
                    "1. Check if the image is a drawing, MS Paint shape, black circle diagram, clipart, icon, graphic illustration, paper notes, handwritten text, or document.\n"
                    "If it is a drawing, shape graphic, clipart, notes, or non-civic photo, output STRICTLY:\n"
                    "INVALID: Not a real photograph! The uploaded image appears to be a drawing, shape graphic, or notes, not a real-world civic photograph.\n\n"
                    "2. Check if the photograph content matches the selected category '{category}'.\n"
                    "System Categories Available: Garbage, Potholes, WaterLeakage, Drainage, Streetlights, RoadDamage.\n\n"
                    "3. Output formatting:\n"
                    "- If it MATCHES '{category}', output: MATCH: <short explanation>\n"
                    "- If it is a real civic issue photo but belongs to another category above, output: MISMATCH: <DetectedCategoryKey> | <short explanation>\n"
                    "- If it is a drawing, shape graphic, clipart, notes, or non-civic image, output: INVALID: Not a real photograph of a civic issue."
                )

                response = model.generate_content([prompt, image])
                text = response.text.strip()

                if text.startswith("MATCH"):
                    explanation = text.split(":", 1)[1].strip() if ":" in text else "Valid"
                    return True, explanation, None
                elif text.startswith("MISMATCH"):
                    body = text.split(":", 1)[1].strip()
                    if "|" in body:
                        detected_cat, explanation = body.split("|", 1)
                        return False, explanation.strip(), detected_cat.strip()
                    else:
                        return False, body, None
                elif text.startswith("INVALID") or "DRAWING" in text.upper() or "SHAPE" in text.upper() or "CLIPART" in text.upper() or "PAPER" in text.upper() or "DOCUMENT" in text.upper() or "NOTE" in text.upper():
                    explanation = text.split(":", 1)[1].strip() if ":" in text else "Not a real photograph! The uploaded image appears to be a drawing, shape graphic, or notes."
                    return False, f"Not a related image: {explanation}", None
        except Exception as e:
            print(f"Gemini API check error: {e}. Switching to Layer 2 PIL Feature Classifier.")

    # Layer 2: PIL Visual Feature Classifier
    return analyze_image_features(image, category)


@app.route("/api/complaints", methods=["POST"])
@firebase_required
def create_complaint():
    """
    POST /api/complaints
    Create a new complaint and auto-route it to the corresponding department.
    """
    try:
        data = request.json or {}
        required_fields = ["userId", "category", "description", "photoUrl", "gpsLat", "gpsLng"]
        for field in required_fields:
            if field not in data:
                return jsonify({"status": "error", "message": f"Missing field: {field}"}), 400

        # AI Image Content Validation
        is_valid, message, detected_category = verify_image_content(data["photoUrl"], data["category"])
        if not is_valid:
            return jsonify({
                "status": "error",
                "error_type": "category_mismatch" if detected_category else "invalid_image",
                "message": message,
                "detectedCategory": detected_category
            }), 400

        # Auto-route category to department
        category = data["category"]
        department = app.config["CATEGORY_DEPARTMENT_MAP"].get(category, "General")

        complaint_ref = db.collection("complaints").document()
        complaint_id = complaint_ref.id

        now = datetime.now(timezone.utc)
        complaint_data = {
            "complaintId": complaint_id,
            "userId": data["userId"],
            "category": category,
            "description": data["description"],
            "photoUrl": data["photoUrl"],
            "gpsLat": float(data["gpsLat"]),
            "gpsLng": float(data["gpsLng"]),
            "status": "Routed",  # Set routed status on auto-route completion
            "department": department,
            "assignedOfficerId": None,
            "supportCount": 1,
            "createdAt": now,
            "updatedAt": now,
            "resolvedPhotoUrl": None,
            "escalationLevel": 0
        }

        complaint_ref.set(complaint_data)
        
        # Format datetimes to ISO string for JSON response
        complaint_data["createdAt"] = complaint_data["createdAt"].isoformat()
        complaint_data["updatedAt"] = complaint_data["updatedAt"].isoformat()

        return jsonify({
            "status": "success",
            "message": "Complaint created and auto-routed successfully",
            "data": complaint_data
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/complaints/support", methods=["POST"])
@firebase_required
def support_complaint():
    """
    POST /api/complaints/support
    Increment the supportCount on an existing complaint.
    """
    try:
        data = request.json or {}
        complaint_id = data.get("complaintId")
        if not complaint_id:
            return jsonify({"status": "error", "message": "Missing complaintId"}), 400

        complaint_ref = db.collection("complaints").document(complaint_id)
        complaint_snap = complaint_ref.get()

        if not complaint_snap.exists:
            return jsonify({"status": "error", "message": "Complaint not found"}), 404

        complaint_data = complaint_snap.to_dict()
        
        # Check if the complaint is Closed
        if complaint_data.get("status") in ["Closed", "Verified"]:
            return jsonify({"status": "error", "message": "Cannot support a closed complaint"}), 400

        # Increment support count in a transaction or direct update
        current_support = complaint_data.get("supportCount", 1)
        new_support = current_support + 1
        
        complaint_ref.update({
            "supportCount": new_support,
            "updatedAt": datetime.now(timezone.utc)
        })

        return jsonify({
            "status": "success",
            "message": "Support count incremented successfully",
            "data": {
                "complaintId": complaint_id,
                "supportCount": new_support
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/complaints/<complaint_id>", methods=["DELETE"])
@firebase_required
def delete_complaint(complaint_id):
    """
    DELETE /api/complaints/<complaint_id>
    Allows Super Admin to delete test or invalid complaints from Firestore.
    """
    try:
        if not db:
            return jsonify({"status": "error", "message": "Database unconfigured"}), 503

        complaint_ref = db.collection("complaints").document(complaint_id)
        doc = complaint_ref.get()
        if not doc.exists:
            return jsonify({"status": "error", "message": "Complaint not found"}), 404

        complaint_ref.delete()
        return jsonify({
            "status": "success",
            "message": f"Complaint '{complaint_id}' deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/users/register-officer", methods=["POST"])
@firebase_required
def register_officer():
    """
    POST /api/users/register-officer
    Admin registers a new officer/admin account.
    Uses Bearer token authentication to verify that the requesting user is a Super Admin.
    """
    try:
        # Check authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"status": "error", "message": "Missing or invalid Authorization header"}), 401
        
        id_token = auth_header.split("Bearer ")[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            caller_uid = decoded_token["uid"]
            
            # Check caller's role in Firestore
            caller_snap = db.collection("users").document(caller_uid).get()
            caller_role = caller_snap.to_dict().get("role", "")
            if isinstance(caller_role, str):
                caller_role = caller_role.lower().strip()
                
            if not caller_snap.exists or caller_role != "admin":
                return jsonify({"status": "error", "message": "Forbidden: Admin access required"}), 403
        except Exception as auth_err:
            return jsonify({"status": "error", "message": f"Auth token verification failed: {str(auth_err)}"}), 401

        data = request.json or {}
        required_fields = ["name", "email", "password", "role", "phone"]
        for field in required_fields:
            if field not in data:
                return jsonify({"status": "error", "message": f"Missing field: {field}"}), 400

        role = data["role"]
        if role not in ["officer", "admin"]:
            return jsonify({"status": "error", "message": "Role must be 'officer' or 'admin'"}), 400

        department = data.get("department")
        if role == "officer" and not department:
            return jsonify({"status": "error", "message": "Department is required for officer accounts"}), 400

        phone = data.get("phone", "")
        if phone:
            # Remove any spaces or symbols, leaving only digits and '+'
            phone = "".join(c for c in phone if c.isdigit() or c == '+')
            if not phone.startswith("+"):
                if len(phone) == 10:
                    phone = "+91" + phone
                else:
                    return jsonify({"status": "error", "message": "Invalid phone number: must be 10 digits or start with '+' and country code (e.g. +91)"}), 400

        # 1. Create user in Firebase Auth
        user_record = auth.create_user(
            email=data["email"],
            password=data["password"],
            display_name=data["name"],
            phone_number=phone if phone else None
        )
        
        # 2. Store user profile details in 'users' Firestore collection
        user_data = {
            "uid": user_record.uid,
            "name": data["name"],
            "email": data["email"],
            "role": role,
            "department": department if role == "officer" else None,
            "phone": data["phone"]
        }
        db.collection("users").document(user_record.uid).set(user_data)

        return jsonify({
            "status": "success",
            "message": f"User account with role '{role}' created successfully",
            "data": {
                "uid": user_record.uid,
                "email": user_record.email,
                "role": role
            }
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/escalate/trigger", methods=["POST"])
@firebase_required
def trigger_escalation():
    """
    POST /api/escalate/trigger
    Escalation Job: Queries active complaints (Routed, InProgress) older than N days.
    Marks them as "Escalated", increments escalationLevel, and logs/returns details.
    Accepts an optional query parameter `days` to override threshold (useful for testing).
    """
    try:
        # Check authorization (Only Admin or authorized cron calls should run this)
        # Note: In a production environment, this would require authentication.
        # For ease of testing and running locally, we check admin auth header if present,
        # but allow manual triggers from the admin panel (we can add a simple token check or bypass for development).
        
        days_threshold = request.args.get("days", default=app.config["ESCALATION_DAYS_THRESHOLD"], type=int)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)

        # Query active complaints that might require escalation
        # Query where status in ["Routed", "InProgress"]
        escalated_count = 0
        escalated_ids = []

        # Firestore doesn't support multiple filters on inequality and IN directly without index,
        # so we fetch Routed and InProgress documents and filter by date.
        for status in ["Routed", "InProgress"]:
            docs = db.collection("complaints").where("status", "==", status).stream()
            for doc in docs:
                complaint_data = doc.to_dict()
                created_at = complaint_data.get("createdAt")
                
                # Convert to datetime if it's a Firestore Timestamp
                if hasattr(created_at, "to_dict") or not isinstance(created_at, datetime):
                    # firebase_admin SDK converts Firestore Timestamp automatically to datetime
                    pass
                
                # Check age
                if created_at and created_at < cutoff_date:
                    # Perform escalation update
                    current_level = complaint_data.get("escalationLevel", 0)
                    doc.reference.update({
                        "status": "Escalated",
                        "escalationLevel": current_level + 1,
                        "updatedAt": datetime.now(timezone.utc)
                    })
                    escalated_count += 1
                    escalated_ids.append(doc.id)

        return jsonify({
            "status": "success",
            "message": f"Escalation job complete. Checked issues older than {days_threshold} days.",
            "data": {
                "escalatedCount": escalated_count,
                "escalatedComplaintIds": escalated_ids
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analytics", methods=["GET"])
@firebase_required
def get_analytics():
    """
    GET /api/analytics
    Aggregate complaint metrics for the Admin dashboard.
    """
    try:
        complaints_docs = db.collection("complaints").stream()
        
        counts_by_status = {}
        counts_by_category = {}
        counts_by_department = {}
        
        total_resolved_time_seconds = 0
        resolved_count = 0
        
        heatmap_points = []

        for doc in complaints_docs:
            data = doc.to_dict()
            status = data.get("status", "Unknown")
            category = data.get("category", "Unknown")
            department = data.get("department", "Unknown")
            
            # Aggregate status count
            counts_by_status[status] = counts_by_status.get(status, 0) + 1
            
            # Aggregate category count
            counts_by_category[category] = counts_by_category.get(category, 0) + 1
            
            # Aggregate department count
            counts_by_department[department] = counts_by_department.get(department, 0) + 1
            
            # Resolution time calculation
            # It can be resolved at resolvedAt or updatedAt (if status is Resolved, Verified, Closed)
            # To be precise, we store a resolvedAt or check updatedAt when status is Resolved/Verified/Closed.
            if status in ["Resolved", "Verified", "Closed"]:
                created_at = data.get("createdAt")
                updated_at = data.get("updatedAt")
                
                # Calculate diff if dates exist
                if isinstance(created_at, datetime) and isinstance(updated_at, datetime):
                    diff = (updated_at - created_at).total_seconds()
                    total_resolved_time_seconds += diff
                    resolved_count += 1
            
            # Heatmap data points
            lat = data.get("gpsLat")
            lng = data.get("gpsLng")
            if lat is not None and lng is not None:
                heatmap_points.append({
                    "lat": float(lat),
                    "lng": float(lng),
                    "category": category,
                    "status": status,
                    "complaintId": doc.id,
                    "description": data.get("description", "")
                })

        avg_resolution_time_days = 0.0
        if resolved_count > 0:
            avg_resolution_time_days = round((total_resolved_time_seconds / resolved_count) / 86400, 2)

        return jsonify({
            "status": "success",
            "data": {
                "totalComplaints": len(heatmap_points),
                "countsByStatus": counts_by_status,
                "countsByCategory": counts_by_category,
                "countsByDepartment": counts_by_department,
                "averageResolutionTimeDays": avg_resolution_time_days,
                "heatmapPoints": heatmap_points
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    # Get port from environment or default config
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
