import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const TABLE_NAME = "contact_submissions";

// --- DOM Elements ---
const contactForm = document.getElementById("contactForm");
const formMessageDiv = document.getElementById("formMessage");
const currentYearSpan = document.getElementById("currentYear");
const nameInput = document.getElementById("contactName");
const emailInput = document.getElementById("contactEmail");
const subjectInput = document.getElementById("contactSubject");
const messageInput = document.getElementById("contactMessage");
const submitButton = contactForm?.querySelector('.btn-submit-contact');

// Nav & Theme
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');
const overlay = document.getElementById('overlay');
const logoutButton = document.getElementById('logoutButton');
const themeToggle = document.getElementById('themeToggle');

// --- Global State ---
let currentUser = null;

// --- Helper Functions ---
const showFormMessage = (message, type = 'error') => {
    if (!formMessageDiv) return;
    formMessageDiv.textContent = message;
    formMessageDiv.className = `form-message ${type} show`;
};
const setSubmitLoading = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.classList.toggle('loading', isLoading);
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    initializeNavigation();
    setActiveNavLink();
    initializeLoadAnimations();
    setInitialToggleState();

    await checkUserAndPrefillForm();

    themeToggle?.addEventListener('change', () => setThemePreference(themeToggle.checked ? 'dark' : 'light'));
    logoutButton?.addEventListener('click', handleLogout);
    contactForm?.addEventListener("submit", handleContactSubmit);
});

// --- Authentication & Form Prefill ---
async function checkUserAndPrefillForm() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user; // Will be null if not logged in

    if (currentUser) {
        // If user is logged in, pre-fill and disable name/email fields
        nameInput.value = currentUser.user_metadata?.full_name || 'Logged In User';
        emailInput.value = currentUser.email;
        [nameInput, emailInput].forEach(input => {
            input.parentElement.classList.add('floating-active'); // Ensure label floats
            input.readOnly = true;
        });
    }
    // No 'else' block needed; if no user, fields are just empty and editable
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// --- Form Submission ---
async function handleContactSubmit(event) {
    event.preventDefault();
    formMessageDiv.className = 'form-message'; // Clear previous message

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !email || !subject || !message) {
        showFormMessage("Please fill in all required fields.", "error");
        return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showFormMessage("Please enter a valid email address.", "error");
        return;
    }

    setSubmitLoading(true);

    try {
        const submissionData = { name, email, subject, message, submitted_at: new Date().toISOString() };
        const { error } = await supabase.from(TABLE_NAME).insert(submissionData);
        if (error) throw new Error(`Database error: ${error.message}`);

        showFormMessage("Message sent successfully! We'll get back to you soon.", "success");
        contactForm.reset();
        
        // If user was logged in, re-run prefill logic after reset
        if(currentUser) {
            checkUserAndPrefillForm();
        }

    } catch (error) {
        console.error("Contact form submission error:", error);
        showFormMessage(`Error sending message: ${error.message}`, "error");
    } finally {
        setSubmitLoading(false);
    }
}

// --- Consistent Navigation, Theme, and Animation Functions ---
const initializeNavigation = () => {
    const toggleNav = () => {
        navMenu.classList.toggle('active');
        menuBtn.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('nav-open');
    };
    menuBtn?.addEventListener('click', toggleNav);
    overlay?.addEventListener('click', toggleNav);
};

const setActiveNavLink = () => {
    const currentPageName = 'contact.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-page');
        if (link.href.includes(currentPageName)) {
            link.classList.add('active-page');
        }
    });
};

const setThemePreference = (theme) => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    try { localStorage.setItem('theme', theme); } catch (e) { console.error("Failed to save theme:", e); }
};

const setInitialToggleState = () => {
    if (themeToggle) themeToggle.checked = !document.documentElement.classList.contains('light-theme');
};

const initializeLoadAnimations = () => {
    document.querySelectorAll('.animate-on-load').forEach((el, i) => {
        setTimeout(() => el.classList.add('is-visible'), 100 * (i + 1));
    });
};