import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const lostItemsList = document.getElementById("lostItemsList");
const foundItemsList = document.getElementById("foundItemsList");
const currentYearSpan = document.getElementById("currentYear");
const logoutButton = document.getElementById('logoutButton');
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');
const overlay = document.getElementById('overlay');
const themeToggle = document.getElementById('themeToggle');

// Modal Elements
const itemModal = document.getElementById("itemModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalCampus = document.getElementById("modalCampus")?.querySelector('.detail-value');
const modalLastSeen = document.getElementById("modalLastSeen")?.querySelector('.detail-value');
const modalContact = document.getElementById("modalContact")?.querySelector('.detail-value');
const modalDateContainer = document.getElementById("modalDateItem");

// --- Global State ---
let scrollObserver;
let currentUser = null;

// --- Helper Functions ---
function formatDate(dateString) { if (!dateString) return "Unknown"; try { const date = new Date(dateString); return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return "Unknown"; } }

// --- Theme Switching & Nav ---
function applyTheme(theme) { document.documentElement.classList.toggle('light-theme', theme === 'light'); }
function setThemePreference(theme) { applyTheme(theme); try { localStorage.setItem('theme', theme); } catch (e) { console.error("Failed to save theme:", e); } }
function setInitialToggleState() { if (!themeToggle) return; themeToggle.checked = !document.documentElement.classList.contains('light-theme'); }
function initializeNavigation() { function toggleNav() { navMenu.classList.toggle('active'); menuBtn.classList.toggle('active'); overlay.classList.toggle('active'); document.body.classList.toggle('nav-open'); } if (menuBtn) menuBtn.addEventListener('click', toggleNav); if (overlay) overlay.addEventListener('click', toggleNav); }
function setActiveNavLink() { const currentPage = window.location.pathname.split('/').pop() || 'home.html'; const activeLink = document.querySelector(`.nav-link[href*="${currentPage}"]`); if (activeLink) activeLink.classList.add('active-page'); }

// --- Authentication ---
async function checkUserSession() { const { data, error } = await supabase.auth.getUser(); if (error || !data?.user) { window.location.href = 'login.html'; return null; } currentUser = data.user; return currentUser; }
async function handleLogout() { await supabase.auth.signOut(); window.location.href = 'login.html'; }

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    await checkUserSession();
    if (!currentUser) return;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    
    initializeNavigation();
    setActiveNavLink();
    initializeScrollAnimations();
    initializeLoadAnimations();
    setInitialToggleState();

    if (themeToggle) themeToggle.addEventListener('change', () => setThemePreference(themeToggle.checked ? 'dark' : 'light'));
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    
    loadLostItems();
    loadFoundItems();

    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
    if (itemModal) itemModal.addEventListener("click", (e) => { if (e.target === itemModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && itemModal?.classList.contains('active')) closeModal(); });
});

// --- Data Fetching & Rendering ---
async function loadLostItems() {
    if (!lostItemsList) return;
    lostItemsList.innerHTML = `<p class="loading-placeholder">Loading lost items...</p>`;
    try {
        const { data, error } = await supabase.from("lost_items").select("*").order("date_lost", { ascending: false }).limit(3);
        if (error) throw error;
        renderItems(data || [], lostItemsList, "lost");
    } catch (err) {
        console.error("Error fetching lost items:", err);
        if (lostItemsList) lostItemsList.innerHTML = `<p class="loading-placeholder" style="color:var(--error-color);">Failed to load lost items.</p>`;
    }
}

async function loadFoundItems() {
    if (!foundItemsList) return;
    foundItemsList.innerHTML = `<p class="loading-placeholder">Loading found items...</p>`;
    try {
        console.log("Fetching found items from Supabase...");

        // **FIX:** The filter `.eq('status', 'Available')` was removed.
        // This will now show the 3 most recently added found items,
        // regardless of their status. This is better for a "Recent Items" feed.
        const { data, error } = await supabase
            .from("found_items")
            .select("*")
            .order("date_found", { ascending: false })
            .limit(3);

        if (error) {
            throw error;
        }

        console.log("Found items data received:", data); // Added for debugging
        renderItems(data || [], foundItemsList, "found");

    } catch (err) {
        console.error("Error fetching found items:", err);
        if (foundItemsList) {
            foundItemsList.innerHTML = `<p class="loading-placeholder" style="color:var(--error-color);">Failed to load found items.</p>`;
        }
    }
}


function renderItems(items, container, type) {
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = `<p class='loading-placeholder'>No ${type} items found recently.</p>`;
        return;
    }
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "item-card animate-on-scroll";

        const itemName = item.name || "Unnamed Item";
        const campus = item.campus || "N/A";
        const dateValue = type === "lost" ? item.date_lost : item.date_found;
        const dateLabel = type === "lost" ? "Lost" : "Found";
        const description = item.description || "No description provided.";
        const imageUrl = item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg';

        card.innerHTML = `
            <div class="item-image">
                <img src="${imageUrl}" alt="${itemName}" loading="lazy">
            </div>
            <div class="item-info">
                <h3>${itemName}</h3>
                <p class="item-description">${description}</p>
                <p class="item-meta">
                    <i class="fas fa-university accent-icon"></i> ${campus}<br>
                    <i class="fas fa-calendar-alt accent-icon"></i> ${dateLabel}: ${formatDate(dateValue)}
                </p>
            </div>
        `;
        card.addEventListener("click", () => openModal(item, type));
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
    observeElements(container.querySelectorAll('.item-card'));
}

// --- Modal Handling ---
function openModal(item, type) {
    if (!itemModal) return;
    modalImage.src = item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg';
    modalImage.alt = item.name || "Item Image";
    modalTitle.textContent = item.name || "Unnamed Item";
    modalDescription.textContent = item.description || "No description provided.";
    if (modalCampus) modalCampus.textContent = item.campus ?? "N/A";
    if (modalLastSeen) {
        const locationLabel = type === 'lost' ? 'Last Seen:' : 'Location Found:';
        const locationValue = type === 'lost' ? (item.last_seen ?? "N/A") : (item.location_found ?? "N/A");
        const locationTextNode = modalLastSeen.parentNode.childNodes[1];
        if (locationTextNode && locationTextNode.nodeType === Node.TEXT_NODE) {
            locationTextNode.nodeValue = ` ${locationLabel} `;
        }
        modalLastSeen.textContent = locationValue;
    }
    if (modalContact) modalContact.textContent = item.contact ?? "Not Provided";
    if (modalDateContainer) {
        const dateValue = type === "lost" ? item.date_lost : item.date_found;
        const dateLabel = type === "lost" ? "Date Lost" : "Date Found";
        modalDateContainer.innerHTML = `<i class="fas fa-calendar-alt modal-icon"></i> ${dateLabel}: <span class="detail-value">${formatDate(dateValue)}</span>`;
    }
    itemModal.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeModal() {
    if (!itemModal) return;
    itemModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

// --- Animation Logic ---
function handleIntersection(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}
function observeElements(elements) {
    if (!scrollObserver) {
        scrollObserver = new IntersectionObserver(handleIntersection, { root: null, rootMargin: '0px', threshold: 0.1 });
    }
    elements.forEach(el => scrollObserver.observe(el));
}
function initializeScrollAnimations() {
    observeElements(document.querySelectorAll('.animate-on-scroll'));
}
function initializeLoadAnimations() {
    const elementsToAnimateOnLoad = document.querySelectorAll('.animate-on-load');
    setTimeout(() => {
        elementsToAnimateOnLoad.forEach(el => el.classList.add('is-visible'));
    }, 100);
}