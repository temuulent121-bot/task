import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const claimedItemsList = document.getElementById('claimedItemsList');
const actionMessageDiv = document.getElementById('actionMessage');
const currentYearSpan = document.getElementById("currentYear");
const logoutButton = document.getElementById('logoutButton');
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');
const overlay = document.getElementById('overlay');
const themeToggle = document.getElementById('themeToggle');
const searchBar = document.getElementById('searchBar');
const dateFilter = document.getElementById('dateFilter');
const resetBtn = document.getElementById('resetBtn');

// Discrepancy Modal Elements
const discrepancyModal = document.getElementById("discrepancyModal");
const copyReportBtn = document.getElementById("copyReportBtn");
const discrepancyDetailsDiv = document.getElementById("discrepancyDetails");

// --- Global State ---
let currentUser = null;
let scrollObserver;
let allClaimedItems = [];

// --- Helper Functions ---
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown";
const showLoadingIndicator = (show) => document.querySelector('.loading-indicator')?.classList.toggle('show', show);
const showActionMessage = (message, type = 'error') => {
    if (!actionMessageDiv) return;
    actionMessageDiv.textContent = message;
    actionMessageDiv.className = `form-message ${type} show`;
    setTimeout(() => { if (actionMessageDiv) actionMessageDiv.className = 'form-message'; }, 5000);
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    await checkUserSession();
    if (!currentUser) return;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    initializeNavigation();
    setActiveNavLink();
    initializeLoadAnimations();
    setInitialToggleState();

    themeToggle?.addEventListener('change', () => setThemePreference(themeToggle.checked ? 'dark' : 'light'));
    logoutButton?.addEventListener('click', handleLogout);

    searchBar.addEventListener('input', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', () => {
        searchBar.value = '';
        dateFilter.value = '';
        applyFilters();
    });
    
    document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', closeDiscrepancyModal));
    discrepancyModal.addEventListener('click', (e) => e.target === discrepancyModal && closeDiscrepancyModal());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && discrepancyModal.classList.contains('active') && closeDiscrepancyModal());
    
    loadAndRenderClaimedItems();
});

// --- Authentication ---
async function checkUserSession() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = data.user;
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// --- Data Fetching and Rendering ---
async function loadAndRenderClaimedItems() {
    showLoadingIndicator(true);
    try {
        // Fetch from both tables
        const { data: foundData, error: foundError } = await supabase.from('found_items').select('*').eq('status', 'Resolved');
        if (foundError) throw foundError;

        const { data: lostData, error: lostError } = await supabase.from('lost_items').select('*').eq('status', 'Resolved');
        if (lostError) throw lostError;

        // Add a 'type' property to distinguish them
        const processedFound = foundData.map(item => ({ ...item, type: 'Found' }));
        const processedLost = lostData.map(item => ({ ...item, type: 'Lost' }));

        // Combine, sort, and store
        allClaimedItems = [...processedFound, ...processedLost].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        applyFilters();

    } catch (error) {
        console.error("Error loading resolved items:", error);
        showActionMessage(`Could not load items: ${error.message}`, 'error');
        claimedItemsList.innerHTML = `<p class="no-items-message"><i class="fas fa-exclamation-triangle"></i> Failed to load data.</p>`;
    } finally {
        showLoadingIndicator(false);
    }
}

function applyFilters() {
    const searchTerm = searchBar.value.toLowerCase();
    const filterDate = dateFilter.value;

    let filteredItems = allClaimedItems;

    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.campus.toLowerCase().includes(searchTerm)
        );
    }

    if (filterDate) {
        filteredItems = filteredItems.filter(item => {
            const itemDate = new Date(item.type === 'Found' ? item.date_found : item.date_lost).toISOString().split('T')[0];
            return itemDate === filterDate;
        });
    }

    renderClaimedItems(filteredItems);
}

function renderClaimedItems(items) {
    claimedItemsList.innerHTML = '';
    if (!items || items.length === 0) {
        claimedItemsList.innerHTML = `<p class="no-items-message"><i class="fas fa-search"></i> No resolved items match your filters.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.addEventListener('click', () => openDiscrepancyModal(item));

        const imageUrl = item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg';
        const date = item.type === 'Found' ? item.date_found : item.date_lost;
        
        card.innerHTML = `
            <div class="item-image">
                <img src="${imageUrl}" alt="${item.name}" loading="lazy">
            </div>
            <div class="item-info">
                <h3>${item.name}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-meta">
                    <span title="Campus"><i class="fas fa-university"></i> ${item.campus}</span>
                    <span title="Date Resolved"><i class="fas fa-calendar-check"></i> Resolved: ${formatDate(date)}</span>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    claimedItemsList.appendChild(fragment);
    observeElements(claimedItemsList.querySelectorAll('.item-card'));
}


// --- Modal Logic ---
function openDiscrepancyModal(item) {
    if (!discrepancyModal) return;
    const dateLabel = item.type === 'Found' ? 'Date Found' : 'Date Lost';
    const dateValue = item.type === 'Found' ? item.date_found : item.date_lost;

    const reportText = `
-----------------------------------------
DISCREPANCY REPORT DETAILS
-----------------------------------------
**Please describe your issue here.**

-----------------------------------------
DO NOT EDIT BELOW THIS LINE
-----------------------------------------
- Reporting User ID: ${currentUser.id}
- Reporting User Email: ${currentUser.email}
---
- Item ID: ${item.id}
- Item Name: ${item.name}
- Original Status: ${item.type}
- ${dateLabel}: ${formatDate(dateValue)}
- Claimed by User ID: ${item.claimed_by_user_id || 'N/A'}
-----------------------------------------
`;

    discrepancyDetailsDiv.textContent = reportText.trim();
    copyReportBtn.onclick = () => copyDiscrepancyReport(reportText.trim());
    copyReportBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Report Info'; // Reset button text
    discrepancyModal.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeDiscrepancyModal() {
    discrepancyModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

function copyDiscrepancyReport(textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
        copyReportBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => { copyReportBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Report Info'; }, 2500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text. Please copy it manually.');
    });
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
    const currentPageName = 'claimed-items.html';
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
    observeElements(document.querySelectorAll('.animate-on-load'));
};

const observeElements = (elements) => {
    if (!scrollObserver) {
        scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
    }
    elements.forEach(el => scrollObserver.observe(el));
};