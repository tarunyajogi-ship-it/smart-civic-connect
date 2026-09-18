// Localization dictionaries for English and Telugu
const translations = {
  en: {
    // General
    "app_title": "Smart Civic Connect",
    "app_tagline": "Civic Issue Reporting & Resolution Platform",
    "select_language": "Language",
    "logout": "Logout",
    "role_citizen": "Citizen",
    "role_officer": "Officer",
    "role_admin": "Super Admin",
    
    // Auth Screen
    "login_title": "Login to Portal",
    "register_title": "Citizen Registration",
    "email": "Email Address",
    "password": "Password",
    "full_name": "Full Name",
    "phone": "Phone Number",
    "confirm_password": "Confirm Password",
    "role": "Role",
    "department": "Department",
    "login_btn": "Sign In",
    "register_btn": "Register & Sign Up",
    "no_account": "New citizen? Create an account",
    "have_account": "Already have an account? Sign In",
    "signing_in": "Signing in...",
    "registering": "Creating account...",
    
    // Citizen Panel
    "citizen_portal": "Citizen Portal",
    "tab_report": "Report Issue",
    "tab_track": "Track My Issues",
    "tab_map": "Nearby Map",
    
    // Issue Form
    "form_category": "Issue Category",
    "form_select_cat": "Select Category",
    "form_desc": "Description",
    "form_desc_placeholder": "Provide details of the issue (e.g. location details, severity)...",
    "form_photo": "Upload Photo",
    "form_photo_help": "Take or upload a picture of the issue",
    "form_gps": "GPS Location",
    "form_gps_fetching": "Auto-capturing location...",
    "form_gps_captured": "Location captured successfully!",
    "form_gps_error": "Failed to capture location automatically. Please allow location permissions.",
    "submit_complaint": "Submit Complaint",
    "submitting": "Submitting...",
    
    // Duplicate Prompt
    "duplicate_title": "Similar Issue Detected",
    "duplicate_body": "A similar issue in this category has already been reported within 100 meters of your location.",
    "btn_support_complaint": "Support Existing Issue",
    "btn_report_anyway": "Report as New Issue",
    "support_success": "Thank you for supporting this issue! Upvote registered.",
    
    // Tracker
    "my_issues": "My Submitted Issues",
    "no_issues": "You haven't submitted any complaints yet.",
    "support_count": "Supported by: {count} citizens",
    "date_reported": "Reported on",
    "last_updated": "Last updated",
    "assigned_dept": "Assigned Department",
    "escalation_lvl": "Escalation Level",
    
    // Verification Panel
    "verification_title": "Verification Required",
    "verification_prompt": "This issue is marked as Resolved. Has it been resolved to your satisfaction?",
    "btn_verify_yes": "Yes, Close Issue",
    "btn_verify_no": "No, Escalate Issue",
    "status_updated_verified": "Issue closed successfully.",
    "status_updated_escalated": "Issue escalated to Super Admin.",
    
    // Categories
    "cat_Garbage": "Garbage Heap",
    "cat_Potholes": "Potholes",
    "cat_WaterLeakage": "Water Leakage",
    "cat_Drainage": "Drainage Overflow",
    "cat_Streetlights": "Streetlight Defect",
    "cat_RoadDamage": "Road Damage",
    
    // Statuses
    "status_New": "New",
    "status_Routed": "Routed",
    "status_InProgress": "In Progress",
    "status_Resolved": "Resolved",
    "status_Verified": "Verified",
    "status_Escalated": "Escalated",
    "status_Closed": "Closed",

    // Officer Panel
    "officer_portal": "Officer Dashboard",
    "assigned_issues": "Assigned Complaints",
    "officer_dept": "Department: {dept}",
    "btn_start_progress": "Mark In-Progress",
    "btn_resolve_issue": "Mark Resolved",
    "resolve_modal_title": "Resolve Complaint",
    "resolve_photo_label": "Upload Resolved Photo",
    "resolve_desc_label": "Resolution Notes",
    "resolve_desc_placeholder": "Describe what work was done to resolve the issue...",
    "btn_submit_resolution": "Submit Resolution",
    "resolving": "Updating status...",
    
    // Admin Panel
    "admin_portal": "Super Admin Console",
    "analytics_dashboard": "Analytics Dashboard",
    "total_issues": "Total Complaints",
    "avg_res_time": "Avg. Resolution Time",
    "res_time_days": "{days} Days",
    "analytics_status": "Complaints by Status",
    "analytics_category": "Complaints by Category",
    "analytics_department": "Complaints by Department",
    "admin_map_heatmap": "Issue Distribution Heatmap",
    
    // Admin Management
    "manage_users": "User Management",
    "register_officer_title": "Register Officer / Admin",
    "btn_register_user": "Register User Account",
    "officer_list": "Registered Staff",
    "escalated_issues": "Escalated Issues",
    "btn_trigger_escalation": "Run Escalation Check",
    "escalation_checking": "Running...",
    "escalation_check_success": "Escalation check complete! {count} complaints escalated.",
    
    // Departments
    "dept_Sanitation": "Sanitation",
    "dept_WaterSupply": "Water Supply",
    "dept_Electricity": "Electricity",
    "dept_PublicWorks": "Public Works"
  },
  te: {
    // General
    "app_title": "స్మార్ట్ సివిక్ కనెక్ట్",
    "app_tagline": "మునిసిపల్ మరియు గ్రామ పంచాయతీల సమస్యల నివేదిక మరియు పరిష్కార వేదిక",
    "select_language": "భాష",
    "logout": "లాగ్ అవుట్",
    "role_citizen": "పౌరుడు",
    "role_officer": "అధికారి",
    "role_admin": "సూపర్ అడ్మిన్",
    
    // Auth Screen
    "login_title": "పోర్టల్‌కు లాగిన్ చేయండి",
    "register_title": "పౌరుల నమోదు",
    "email": "ఇమెయిల్ చిరునామా",
    "password": "పాస్‌వర్డ్",
    "full_name": "పూర్తి పేరు",
    "phone": "ఫోన్ నంబర్",
    "confirm_password": "పాస్‌వర్డ్ నిర్ధారించండి",
    "role": "పాత్ర (రోల్)",
    "department": "శాఖ (డిపార్ట్‌మెంట్)",
    "login_btn": "లాగిన్ అవ్వండి",
    "register_btn": "నమోదు చేసుకోండి",
    "no_account": "కొత్త పౌరులా? ఖాతా సృష్టించండి",
    "have_account": "ఖాతా ఉందా? లాగిన్ అవ్వండి",
    "signing_in": "లాగిన్ అవుతోంది...",
    "registering": "ఖాతా సృష్టించబడుతోంది...",
    
    // Citizen Panel
    "citizen_portal": "పౌరుల పోర్టల్",
    "tab_report": "సమస్య నివేదిక",
    "tab_track": "నా సమస్యల స్థితి",
    "tab_map": "సమీప పటము (మ్యాప్)",
    
    // Issue Form
    "form_category": "సమస్య విభాగం",
    "form_select_cat": "విభాగాన్ని ఎంచుకోండి",
    "form_desc": "వివరణ",
    "form_desc_placeholder": "సమస్య వివరాలు తెలియజేయండి (ఉదా. లొకేషన్ వివరాలు, సమస్య తీవ్రత)...",
    "form_photo": "ఫోటో అప్‌లోడ్ చేయండి",
    "form_photo_help": "సమస్యను ఫోటో తీయండి లేదా అప్‌లోడ్ చేయండి",
    "form_gps": "GPS లొకేషన్",
    "form_gps_fetching": "లొకేషన్ ఆటో-క్యాప్చర్ అవుతోంది...",
    "form_gps_captured": "లొకేషన్ విజయవంతంగా స్వీకరించబడింది!",
    "form_gps_error": "లొకేషన్ ఆటో-క్యాప్చర్ విఫలమైంది. దయచేసి లొకేషన్ అనుమతులు ఇవ్వండి.",
    "submit_complaint": "ఫిర్యాదు సమర్పించు",
    "submitting": "సమర్పించబడుతోంది...",
    
    // Duplicate Prompt
    "duplicate_title": "ఇలాంటి సమస్య గుర్తించబడింది",
    "duplicate_body": "మీ లొకేషన్‌కు 100 మీటర్ల పరిధిలో ఇదే విభాగంలో ఒక సమస్య ఇప్పటికే నమోదైంది.",
    "btn_support_complaint": "ఈ ఫిర్యాదుకు మద్దతు ఇవ్వండి",
    "btn_report_anyway": "కొత్త ఫిర్యాదుగా నమోదు చేయి",
    "support_success": "ఈ సమస్యకు మద్దతు తెలిపినందుకు ధన్యవాదాలు! ఓటు నమోదైంది.",
    
    // Tracker
    "my_issues": "నేను సమర్పించిన ఫిర్యాదులు",
    "no_issues": "మీరు ఇంకా ఎటువంటి ఫిర్యాదులను సమర్పించలేదు.",
    "support_count": "{count} మంది పౌరులు మద్దతు ఇచ్చారు",
    "date_reported": "ఫిర్యాదు చేసిన తేదీ",
    "last_updated": "చివరిగా నవీకరించబడింది",
    "assigned_dept": "కేటాయించిన శాఖ",
    "escalation_lvl": "తీవ్రత స్థాయి (ఎస్కలేషన్)",
    
    // Verification Panel
    "verification_title": "ధృవీకరణ అవసరం",
    "verification_prompt": "ఈ సమస్య పరిష్కరించబడినట్లుగా గుర్తించబడింది. పరిష్కారం మీకు సంతృప్తికరంగా ఉందా?",
    "btn_verify_yes": "అవును, సమస్యను మూసివేయండి",
    "btn_verify_no": "కాదు, ఎస్కలేట్ చేయండి",
    "status_updated_verified": "సమస్య విజయవంతంగా మూసివేయబడింది.",
    "status_updated_escalated": "సమస్య సూపర్ అడ్మిన్‌కు బదిలీ చేయబడింది.",
    
    // Categories
    "cat_Garbage": "చెత్త కుప్పలు",
    "cat_Potholes": "గుంతలు",
    "cat_WaterLeakage": "నీటి లీకేజీ",
    "cat_Drainage": "డ్రైనేజీ ఓవర్‌ఫ్లో",
    "cat_Streetlights": "వీధి దీపాల సమస్య",
    "cat_RoadDamage": "రోడ్డు దెబ్బతినడం",
    
    // Statuses
    "status_New": "కొత్తది",
    "status_Routed": "దారి మళ్లించబడింది",
    "status_InProgress": "ప్రగతిలో ఉంది",
    "status_Resolved": "పరిష్కరించబడింది",
    "status_Verified": "ధృవీకరించబడింది",
    "status_Escalated": "తీవ్రతరం చేయబడింది",
    "status_Closed": "మూసివేయబడింది",

    // Officer Panel
    "officer_portal": "అధికారి డాష్‌బోర్డ్",
    "assigned_issues": "కేటాయించిన ఫిర్యాదులు",
    "officer_dept": "శాఖ: {dept}",
    "btn_start_progress": "ప్రగతిలోకి మార్చు",
    "btn_resolve_issue": "పరిష్కరించినట్లు మార్చు",
    "resolve_modal_title": "సమస్య పరిష్కారం",
    "resolve_photo_label": "పరిష్కరించిన ఫోటోను అప్‌లోడ్ చేయండి",
    "resolve_desc_label": "పరిష్కార గమనికలు",
    "resolve_desc_placeholder": "ఈ సమస్యను పరిష్కరించడానికి చేసిన పనిని వివరించండి...",
    "btn_submit_resolution": "పరిష్కారాన్ని సమర్పించు",
    "resolving": "స్థితి నవీకరించబడుతోంది...",
    
    // Admin Panel
    "admin_portal": "సూపర్ అడ్మిన్ కన్సోల్",
    "analytics_dashboard": "విశ్లేషణ డాష్‌బోర్డ్",
    "total_issues": "మొత్తం ఫిర్యాదులు",
    "avg_res_time": "సగటు పరిష్కార సమయం",
    "res_time_days": "{days} రోజులు",
    "analytics_status": "స్థితి వారీగా ఫిర్యాదులు",
    "analytics_category": "విభాగం వారీగా ఫిర్యాదులు",
    "analytics_department": "శాఖ వారీగా ఫిర్యాదులు",
    "admin_map_heatmap": "సమస్యల వ్యాప్తి పటము (హీట్‌మ్యాప్)",
    
    // Admin Management
    "manage_users": "వినియోగదారుల నిర్వహణ",
    "register_officer_title": "అధికారి / అడ్మిన్‌ను నమోదు చేయండి",
    "btn_register_user": "ఖాతాను నమోదు చేయి",
    "officer_list": "నమోదైన సిబ్బంది",
    "escalated_issues": "తీవ్రతరం చేయబడిన సమస్యలు (ఎస్కలేటెడ్)",
    "btn_trigger_escalation": "ఎస్కలేషన్ తనిఖీని రన్ చేయి",
    "escalation_checking": "రన్ అవుతోంది...",
    "escalation_check_success": "ఎస్కలేషన్ తనిఖీ పూర్తయింది! {count} ఫిర్యాదులు తీవ్రతరం చేయబడ్డాయి.",
    
    // Departments
    "dept_Sanitation": "శుభ్రత మరియు పరిశుభ్రత (శానిటేషన్)",
    "dept_WaterSupply": "నీటి సరఫరా",
    "dept_Electricity": "విద్యుత్ శాఖ",
    "dept_PublicWorks": "పబ్లిక్ వర్క్స్ (రోడ్లు)"
  }
};

// Default language is English
let currentLang = localStorage.getItem("language") || "en";

/**
 * Initialize language settings on load
 */
function initI18n() {
  applyTranslations();
  setupLanguageToggles();
}

/**
 * Change the active language
 * @param {string} lang 'en' or 'te'
 */
function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem("language", lang);
    applyTranslations();
    updateLanguageButtons();
    
    // Trigger custom event for other scripts to re-render dynamic elements
    const event = new CustomEvent("languageChanged", { detail: { language: lang } });
    window.dispatchEvent(event);
  }
}

/**
 * Get translation value for a key. Falls back to key if not found.
 * Supports placeholder substitution like {count}
 * @param {string} key 
 * @param {object} params key-value pairs to replace in string
 * @returns {string} translated text
 */
function t(key, params = {}) {
  let val = translations[currentLang][key] || translations["en"][key] || key;
  
  // Replace params
  for (const p in params) {
    val = val.replace(`{${p}}`, params[p]);
  }
  
  return val;
}

/**
 * Update UI text for elements with data-i18n attributes
 */
function applyTranslations() {
  // Elements with standard data-i18n translation
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    
    // Handle parameters if available
    let params = {};
    if (elem.getAttribute("data-i18n-params")) {
      try {
        params = JSON.parse(elem.getAttribute("data-i18n-params"));
      } catch (e) {
        console.error("Error parsing translation params", e);
      }
    }
    
    elem.innerText = t(key, params);
  });
  
  // Elements with placeholder translations
  document.querySelectorAll("[data-i18n-placeholder]").forEach(elem => {
    const key = elem.getAttribute("data-i18n-placeholder");
    elem.setAttribute("placeholder", t(key));
  });
}

/**
 * Bind language toggles to the language setter
 */
function setupLanguageToggles() {
  updateLanguageButtons();
  
  // Find any language buttons and bind click
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      setLanguage(lang);
    });
  });
}

/**
 * Update button active states in toggle
 */
function updateLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    const lang = btn.getAttribute("data-lang");
    if (lang === currentLang) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// Execute on document ready (if not module load)
document.addEventListener("DOMContentLoaded", initI18n);
