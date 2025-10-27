// Import the Supabase client library
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Your Supabase project URL and anon key
const supabaseUrl = "https://uzrhdhfhavvajvvozsur.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- DOM Elements ---
const signupForm      = document.getElementById("signupForm");
const loginForm       = document.getElementById("loginForm");
const formMessageDiv  = document.getElementById("formMessage");
const themeToggle     = document.getElementById('themeToggle');

// --- Helper Functions ---
/**
 * Displays a message in the form's message box.
 * @param {string} message The message to display.
 * @param {'error' | 'success'} type The type of message.
 */
function displayMessage(message, type = 'error') {
  if (!formMessageDiv) return;
  formMessageDiv.textContent = message;
  // Reset classes
  formMessageDiv.classList.remove('success-message', 'error-message');
  // Add the correct classes to show and style the message
  formMessageDiv.classList.add(`${type}-message`, 'show');
}

function clearMessage() {
  if (!formMessageDiv) return;
  formMessageDiv.textContent = '';
  formMessageDiv.classList.remove('show', 'success-message', 'error-message');
}

function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle('loading', isLoading);
}

// --- Theme Switching Logic ---
function applyTheme(theme) {
  document.documentElement.classList.toggle('light-theme', theme === 'light');
}
function setThemePreference(theme) {
  applyTheme(theme);
  try { localStorage.setItem('theme', theme); } catch (e) { console.error("Failed to save theme:", e); }
}
function setInitialToggleState() {
  if (!themeToggle) return;
  const isLight = document.documentElement.classList.contains('light-theme');
  themeToggle.checked = !isLight;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setInitialToggleState();
  if (themeToggle) {
    themeToggle.addEventListener('change', function() {
      setThemePreference(this.checked ? 'dark' : 'light');
    });
  }
  setupPasswordToggleListeners();
  setupFloatingLabelListeners();
  setupAuthForms();
  checkForSignupSuccess();
});

/**
 * Checks URL for a 'signup=success' parameter and shows a message.
 */
function checkForSignupSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('signup') && urlParams.get('signup') === 'success') {
        displayMessage("Signup successful! Please check your email to verify your account before logging in.", "success");
    }
}

// --- Password Visibility Toggle ---
function setupPasswordToggleListeners() {
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const inputGroup = toggle.closest('.input-group');
      const pwdInput = inputGroup ? inputGroup.querySelector('input') : null;
      const icon = toggle.querySelector('i');
      if (!pwdInput || !icon) return;

      const show = pwdInput.type === 'password';
      pwdInput.type = show ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !show);
      icon.classList.toggle('fa-eye-slash', show);
    });
  });
}

// --- Floating Label Inputs ---
function setupFloatingLabelListeners() {
  document.querySelectorAll('.input-group.floating input').forEach(input => {
    const checkValue = () => input.classList.toggle('has-value', !!input.value);
    input.addEventListener('input', checkValue);
    checkValue();
  });
}

// --- Authentication Forms ---
function setupAuthForms() {
  // Signup Logic
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessage();
      const name = signupForm.elements.name.value.trim();
      const email = signupForm.elements.email.value.trim();
      const password = signupForm.elements.password.value.trim();
      const submitBtn = signupForm.querySelector('.btn-submit');
      
      if (!name || !email || !password) { displayMessage("Please fill in all fields.", "error"); return; }
      if (password.length < 6) { displayMessage("Password must be at least 6 characters.", "error"); return; }

      setLoading(submitBtn, true);
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              full_name: name, 
              role: 'user' 
            } 
          }
        });
        if (error) throw error;
        window.location.href = "login.html?signup=success";
      } catch (err) {
        displayMessage(err.message || "Signup failed. Please try again.", "error");
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // Login Logic
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessage();
      const email = loginForm.elements.email.value.trim();
      const password = loginForm.elements.password.value.trim();
      const btn = loginForm.querySelector('.btn-submit');
      
      if (!email || !password) { displayMessage("Please enter email and password.", "error"); return; }
      
      setLoading(btn, true);
      try {
        // Step 1: Sign in the user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (signInError) throw signInError;

        if (!signInData || !signInData.user) {
            throw new Error("Login succeeded but user data was not returned.");
        }
        
        // Step 2: Check the user's role from their metadata
        const user = signInData.user;
        const userRole = user.user_metadata?.role;

        // Step 3: Redirect based on the role
        // FIXED: Check for 'superadmin' OR 'admin'
        if (userRole === 'superadmin' || userRole === 'admin') {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "home.html";
        }

      } catch (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          displayMessage("Incorrect email or password.", "error");
        } else if (msg.includes("email not confirmed")) {
          displayMessage("Please confirm your email before logging in.", "error");
        } else {
          displayMessage(err.message || "An unexpected error occurred.", "error");
        }
      } finally {
        setLoading(btn, false);
      }
    });
  }
}