import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const itemsListContainer = document.getElementById("itemsList");
const searchBar = document.getElementById("searchBar");
const sortSelect = document.getElementById("sortSelect");
const loadingIndicator = document.querySelector('.loading-indicator');
const currentYearSpan = document.getElementById("currentYear");
const actionMessageDiv = document.getElementById("actionMessage");

// Modals
const itemModal = document.getElementById("itemModal");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editFormMessage = document.getElementById("editFormMessage");

// Nav & Theme
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');
const overlay = document.getElementById('overlay');
const logoutButton = document.getElementById('logoutButton');
const themeToggle = document.getElementById('themeToggle');

// --- Global State ---
let allItems = [];
let currentUser = null;
let scrollObserver;

// --- Helper Functions ---
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-CA') : ""; // YYYY-MM-DD for date input
const showLoadingIndicator = (show) => loadingIndicator?.classList.toggle('show', show);
const showActionMessage = (message, type = 'success') => {
    if (!actionMessageDiv) return;
    actionMessageDiv.textContent = message;
    actionMessageDiv.className = `form-message ${type} show`;
    setTimeout(() => { actionMessageDiv.className = 'form-message'; }, 5000);
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
    searchBar?.addEventListener("input", renderItems);
    sortSelect?.addEventListener("change", renderItems);

    document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', closeAllModals));
    itemModal?.addEventListener('click', (e) => e.target === itemModal && closeAllModals());
    editModal?.addEventListener('click', (e) => e.target === editModal && closeAllModals());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAllModals());

    editForm?.addEventListener('submit', handleUpdateSubmit);

    loadItems();
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
async function loadItems() {
    showLoadingIndicator(true);
    itemsListContainer.innerHTML = ''; 
    if (loadingIndicator) itemsListContainer.appendChild(loadingIndicator);
    
    try {
        const { data, error } = await supabase
            .from("lost_items")
            .select("*")
            .eq('status', 'Active')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allItems = data || [];
        renderItems();
    } catch (error) {
        console.error("Error fetching items:", error);
        itemsListContainer.innerHTML = '<p class="no-items-message"><i class="fas fa-exclamation-triangle"></i> Failed to load items.</p>';
    } finally {
        showLoadingIndicator(false);
    }
}

function renderItems() {
    const searchTerm = searchBar.value.toLowerCase();
    const sortBy = sortSelect.value;

    const filtered = allItems.filter(item => 
        (item.name?.toLowerCase() || '').includes(searchTerm) ||
        (item.description?.toLowerCase() || '').includes(searchTerm) ||
        (item.campus?.toLowerCase() || '').includes(searchTerm)
    );

    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date_lost_asc': return new Date(a.date_lost) - new Date(b.date_lost);
            case 'name_asc': return a.name.localeCompare(b.name);
            case 'name_desc': return b.name.localeCompare(a.name);
            default: return new Date(b.date_lost) - new Date(a.date_lost);
        }
    });

    itemsListContainer.innerHTML = '';
    if (filtered.length === 0) {
        const message = searchTerm ? 'match your search.' : 'been reported.';
        itemsListContainer.innerHTML = `<p class="no-items-message"><i class="fas fa-search"></i> No active lost items ${message}</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-image-wrapper">
                <img src="${item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg'}" alt="${item.name}" loading="lazy">
            </div>
            <div class="item-info">
                <h3>${item.name}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-meta">
                    <span><i class="fas fa-university"></i> ${item.campus}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${new Date(item.date_lost).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => openModalForItem(item));
        fragment.appendChild(card);
    });

    itemsListContainer.appendChild(fragment);
    observeElements(itemsListContainer.querySelectorAll('.item-card'));
}

// --- Modal Logic ---
function openModalForItem(item) {
    if (item.user_id === currentUser.id) {
        populateAndOpenEditModal(item);
    } else {
        populateAndOpenInfoModal(item);
    }
}

function populateAndOpenInfoModal(item) {
    itemModal.querySelector('#modalImage').src = item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg';
    itemModal.querySelector('#modalTitle').textContent = item.name;
    itemModal.querySelector('#modalDetails').innerHTML = `
        <p><strong>Description:</strong><br>${item.description}</p>
        <p><strong>Campus:</strong> ${item.campus}</p>
        <p><strong>Last Seen:</strong> ${item.last_seen}</p>
        <p><strong>Date Lost:</strong> ${new Date(item.date_lost).toLocaleDateString()}</p>
        <p><strong>Contact Reporter:</strong> ${item.contact}</p>
    `;
    itemModal.classList.add('active');
    document.body.classList.add('modal-open');
}

function populateAndOpenEditModal(item) {
    editFormMessage.className = 'form-message'; // Reset message
    editForm.querySelector('#editItemId').value = item.id;
    editForm.querySelector('#editItemName').value = item.name;
    editForm.querySelector('#editDescription').value = item.description;
    editForm.querySelector('#editCampus').value = item.campus;
    editForm.querySelector('#editLastSeen').value = item.last_seen;
    editForm.querySelector('#editDateLost').value = formatDate(item.date_lost);
    editForm.querySelector('#editContact').value = item.contact;
    editModal.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeAllModals() {
    itemModal?.classList.remove('active');
    editModal?.classList.remove('active');
    document.body.classList.remove('modal-open');
}

// --- Item Actions ---
async function handleUpdateSubmit(event) {
    event.preventDefault();
    const saveBtn = editForm.querySelector('#saveChangesBtn');
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    const id = editForm.querySelector('#editItemId').value;
    const updatedData = {
        name: editForm.querySelector('#editItemName').value,
        description: editForm.querySelector('#editDescription').value,
        campus: editForm.querySelector('#editCampus').value,
        last_seen: editForm.querySelector('#editLastSeen').value,
        date_lost: editForm.querySelector('#editDateLost').value,
        contact: editForm.querySelector('#editContact').value,
    };
    
    // Simple validation
    for (const key in updatedData) {
        if (!updatedData[key]) {
            editFormMessage.textContent = 'All fields are required.';
            editFormMessage.className = 'form-message error show';
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            return;
        }
    }

    try {
        const { error } = await supabase
            .from('lost_items')
            .update(updatedData)
            .eq('id', id);

        if (error) throw error;

        // Update item in local state to prevent re-fetch
        const itemIndex = allItems.findIndex(item => item.id == id);
        if (itemIndex > -1) {
            allItems[itemIndex] = { ...allItems[itemIndex], ...updatedData };
        }
        
        renderItems();
        closeAllModals();
        showActionMessage('Report updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating item:', error);
        editFormMessage.textContent = `Error: ${error.message}`;
        editFormMessage.className = 'form-message error show';
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
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
    const currentPageName = 'lost-items.html';
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