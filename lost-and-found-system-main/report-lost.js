import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const BUCKET_NAME = "lost-items";
const TABLE_NAME = "lost_items";

// --- DOM Elements ---
const reportItemForm = document.getElementById("reportItemForm");
const formMessageDiv = document.getElementById("formMessage");
const currentYearSpan = document.getElementById("currentYear");
const submitButton = reportItemForm?.querySelector('.btn-submit-report');

// Form Inputs
const inputs = {
    itemName: document.getElementById("itemName"),
    description: document.getElementById("description"),
    campus: document.getElementById("campus"),
    lastSeen: document.getElementById("lastSeen"),
    contact: document.getElementById("contact"),
    dateLost: document.getElementById("dateLost"),
};

// Image Upload Elements
const imageUploadZone = document.getElementById("imageUploadZone");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const imageFileInput = document.getElementById("imageFile");
const browseBtn = document.getElementById("browseBtn");
const removeImageBtn = document.getElementById("removeImageBtn");
const uploadErrorMessage = document.getElementById("uploadErrorMessage");

// Nav & Theme Elements
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');
const overlay = document.getElementById('overlay');
const logoutButton = document.getElementById('logoutButton');
const themeToggle = document.getElementById('themeToggle');

// --- Global State ---
let selectedFile = null;

// --- Helper & UI Functions ---
function showFormMessage(message, type = 'error') {
    if (!formMessageDiv) return;
    formMessageDiv.innerHTML = message;
    formMessageDiv.className = `form-message ${type} show`;
    formMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setSubmitLoading(isLoading) {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.classList.toggle('loading', isLoading);
}

function resetUploadUI() {
    if (imageFileInput) imageFileInput.value = '';
    selectedFile = null;
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imagePreview) imagePreview.src = '#';
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
    if (uploadErrorMessage) uploadErrorMessage.textContent = '';
}

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'flex';
        uploadPlaceholder.style.display = 'none';
        if (uploadErrorMessage) uploadErrorMessage.textContent = '';
    };
    reader.readAsDataURL(file);
}

// --- Validation Functions ---
function validateField(input) {
    const errorSpan = input.parentElement.querySelector('.input-error-message');
    let isValid = true;
    let errorMessage = '';

    if (input.hasAttribute('required') && !input.value.trim()) {
        isValid = false;
        errorMessage = 'This field is required.';
    } else if (input === inputs.contact) {
        const contactRegex = /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|^\+?[0-9]{9,15})$/;
        if (!contactRegex.test(input.value.trim())) {
            isValid = false;
            errorMessage = 'Please enter a valid email or phone number.';
        }
    } else if (input === inputs.dateLost) {
        const today = new Date();
        const selectedDate = new Date(input.value);
        today.setHours(0, 0, 0, 0);
        if (selectedDate > today) {
            isValid = false;
            errorMessage = 'Date cannot be in the future.';
        }
    }

    if (!isValid) {
        input.parentElement.classList.add('error');
        if (errorSpan) errorSpan.textContent = errorMessage;
    } else {
        input.parentElement.classList.remove('error');
        if (errorSpan) errorSpan.textContent = '';
    }
    return isValid;
}

function validateForm() {
    let isFormValid = true;
    for (const key in inputs) {
        if (!validateField(inputs[key])) {
            isFormValid = false;
        }
    }
    return isFormValid;
}


// --- Event Listeners & Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    // Basic Setup
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    initializeNavigation();
    setActiveNavLink();
    initializeLoadAnimations();
    setInitialToggleState();

    // Event Listeners
    if (themeToggle) themeToggle.addEventListener('change', () => setThemePreference(themeToggle.checked ? 'dark' : 'light'));
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    setupImageUploadListeners();

    // Form submission
    if (reportItemForm) {
        reportItemForm.addEventListener("submit", handleFormSubmit);
    }
    
    // Real-time validation listeners
    for (const key in inputs) {
        inputs[key].addEventListener('blur', () => validateField(inputs[key]));
        inputs[key].addEventListener('input', () => {
            inputs[key].parentElement.classList.remove('error');
            const errorSpan = inputs[key].parentElement.querySelector('.input-error-message');
            if (errorSpan) errorSpan.textContent = '';
        });
    }
});


// --- Image Upload Logic ---
function setupImageUploadListeners() {
    if (!imageUploadZone || !browseBtn || !imageFileInput || !removeImageBtn) return;
    browseBtn.addEventListener('click', () => imageFileInput.click());
    imageUploadZone.addEventListener('click', (e) => { if (e.target.id === 'uploadPlaceholder' || e.target.parentElement.id === 'uploadPlaceholder') imageFileInput.click(); });
    ['dragover', 'dragleave', 'drop'].forEach(eventName => imageUploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (eventName === 'dragover') imageUploadZone.classList.add('dragover');
        if (eventName === 'dragleave') imageUploadZone.classList.remove('dragover');
        if (eventName === 'drop') {
            imageUploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelected(file);
        }
    }));
    removeImageBtn.addEventListener('click', (e) => { e.stopPropagation(); resetUploadUI(); });
}

function handleFileSelected(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (uploadErrorMessage) uploadErrorMessage.textContent = '';

    if (!allowedTypes.includes(file.type)) {
        if (uploadErrorMessage) uploadErrorMessage.textContent = 'Invalid file type. Please use JPG, PNG, or WEBP.';
        return;
    }
    if (file.size > maxSize) {
        if (uploadErrorMessage) uploadErrorMessage.textContent = 'File is too large. Maximum size is 5MB.';
        return;
    }
    selectedFile = file;
    showPreview(file);
}

// --- Main Form Submission Logic ---
async function handleFormSubmit(event) {
    event.preventDefault();
    if (!validateForm()) {
        showFormMessage("Please correct the errors in the form.", "error");
        return;
    }

    setSubmitLoading(true);

    try {
        let imageUrl = null;
        if (selectedFile) {
            const fileName = `public/${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, selectedFile);
            if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
            
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in to report an item.");

        const reportData = {
            name: inputs.itemName.value.trim(),
            description: inputs.description.value.trim(),
            campus: inputs.campus.value,
            last_seen: inputs.lastSeen.value.trim(),
            contact: inputs.contact.value.trim(),
            date_lost: inputs.dateLost.value,
            image_url: imageUrl,
            user_id: user.id,
            status: 'Lost' // Default status for a newly lost item
        };

        const { error: insertError } = await supabase.from(TABLE_NAME).insert(reportData);
        if (insertError) throw new Error(`Database error: ${insertError.message}`);
        
        showFormMessage("Lost item reported successfully. We'll notify you if it's found.", "success");
        reportItemForm.reset();
        resetUploadUI();
        for (const key in inputs) {
            inputs[key].parentElement.classList.remove('error');
            const errorSpan = inputs[key].parentElement.querySelector('.input-error-message');
            if(errorSpan) errorSpan.textContent = '';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error("Form submission error:", error);
        showFormMessage(error.message, "error");
    } finally {
        setSubmitLoading(false);
    }
}

// --- Navigation & Theme Functions (Consistent) ---
function initializeNavigation() {
    function toggleNav() {
        navMenu.classList.toggle('active');
        menuBtn.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('nav-open');
    }
    if (menuBtn) menuBtn.addEventListener('click', toggleNav);
    if (overlay) overlay.addEventListener('click', toggleNav);
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

function setActiveNavLink() {
    const currentPageName = 'report-lost.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-page');
        if(link.href.includes(currentPageName)) {
            link.classList.add('active-page');
        }
    });
}

function setThemePreference(theme) {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    try { localStorage.setItem('theme', theme); } catch (e) { console.error("Failed to save theme:", e); }
}

function setInitialToggleState() {
    if (!themeToggle) return;
    themeToggle.checked = !document.documentElement.classList.contains('light-theme');
}

function initializeLoadAnimations() {
    document.querySelectorAll('.animate-on-load').forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('is-visible');
        }, 100 * (index + 1));
    });
}