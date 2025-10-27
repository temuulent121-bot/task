import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const profileInfoSection = document.querySelector('.profile-info-section');
const profileNameEl = document.getElementById('profileName');
const profileEmailEl = document.getElementById('profileEmail');
const profileJoinedEl = document.getElementById('profileJoined');
const lostCountEl = document.getElementById('lostCount');
const foundCountEl = document.getElementById('foundCount');
const myLostItemsList = document.getElementById('myLostItemsList');
const myFoundItemsList = document.getElementById('myFoundItemsList');
const profileUpdateMessageDiv = document.getElementById('profileUpdateMessage');
const currentYearSpan = document.getElementById("currentYear");

// Profile Edit Elements
const editProfileBtn = document.getElementById('editProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const profileDisplayView = document.querySelector('.profile-display-view');
const profileEditForm = document.getElementById('profileEditForm');
const editProfileNameInput = document.getElementById('editProfileName');
const editProfileEmailInput = document.getElementById('editProfileEmail');
const profileViewActions = document.querySelector('.profile-view-actions');
const profileEditActions = document.querySelector('.profile-edit-actions');

// Edit Item Modal Elements
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editFormMessage = document.getElementById("editFormMessage");

// Reclaim Item Modal Elements
const reclaimModal = document.getElementById("reclaimModal");
const reclaimForm = document.getElementById("reclaimForm");
const reclaimFormMessage = document.getElementById("reclaimFormMessage");

// Nav & Theme
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');
const overlay = document.getElementById('overlay');
const logoutButton = document.getElementById('logoutButton');
const themeToggle = document.getElementById('themeToggle');

// --- Global State ---
let currentUser = null;
let scrollObserver;

// --- Helper Functions ---
const formatDate = (dateString, forInput = false) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return forInput 
        ? date.toISOString().split('T')[0] 
        : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};
const showLoadingIndicator = (listContainer, show) => listContainer?.querySelector('.loading-indicator')?.classList.toggle('show', show);
const showMessage = (div, message, type = 'success') => {
    if (!div) return;
    div.textContent = message;
    div.className = `form-message ${type} show`;
    setTimeout(() => { div.className = 'form-message'; }, 5000);
};
const setLoading = (button, isLoading) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
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

    displayProfileInfo();
    await loadUserItems();

    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    themeToggle?.addEventListener('change', () => setThemePreference(themeToggle.checked ? 'dark' : 'light'));
    logoutButton?.addEventListener('click', handleLogout);
    
    editProfileBtn.addEventListener('click', () => toggleProfileEdit(true));
    cancelEditBtn.addEventListener('click', () => toggleProfileEdit(false));
    saveProfileBtn.addEventListener('click', handleProfileUpdate);
    
    document.querySelector('.profile-posts-section').addEventListener('click', handleItemAction);
    
    document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', closeAllModals));
    editModal.addEventListener('click', (e) => e.target === editModal && closeAllModals());
    reclaimModal.addEventListener('click', (e) => e.target === reclaimModal && closeAllModals());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAllModals());

    editForm.addEventListener('submit', handleItemUpdateSubmit);
    reclaimForm.addEventListener('submit', handleReclaimSubmit);
}

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
    setLoading(logoutButton, true);
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// --- Profile Info & Edit ---
function displayProfileInfo() {
    const name = currentUser.user_metadata?.full_name || 'User';
    const email = currentUser.email;
    profileNameEl.textContent = name;
    profileEmailEl.textContent = email;
    profileJoinedEl.textContent = formatDate(currentUser.created_at);
    editProfileNameInput.value = name;
    editProfileEmailInput.value = email;
}

function toggleProfileEdit(isEditing) {
    profileDisplayView.style.display = isEditing ? 'none' : 'block';
    profileEditForm.style.display = isEditing ? 'block' : 'none';
    profileViewActions.style.display = isEditing ? 'none' : 'block';
    profileEditActions.style.display = isEditing ? 'block' : 'none';

    if (!isEditing) {
        // Reset form to original values on cancel
        displayProfileInfo();
    }
}

async function handleProfileUpdate() {
    const newName = editProfileNameInput.value.trim();
    if (!newName) {
        showMessage(profileUpdateMessageDiv, "Name cannot be empty.", "error");
        return;
    }
    setLoading(saveProfileBtn, true);
    try {
        const { data, error } = await supabase.auth.updateUser({ data: { full_name: newName } });
        if (error) throw error;
        currentUser = data.user;
        displayProfileInfo();
        toggleProfileEdit(false);
        showMessage(profileUpdateMessageDiv, "Profile updated successfully!", "success");
    } catch (error) {
        showMessage(profileUpdateMessageDiv, `Error: ${error.message}`, 'error');
    } finally {
        setLoading(saveProfileBtn, false);
    }
}

// --- User Item Handling ---
async function loadUserItems() {
    showLoadingIndicator(myLostItemsList, true);
    showLoadingIndicator(myFoundItemsList, true);
    try {
        const [lostResult, foundResult] = await Promise.all([
            supabase.from('lost_items').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
            supabase.from('found_items').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
        ]);
        if (lostResult.error) throw lostResult.error;
        renderUserItems(lostResult.data || [], myLostItemsList, 'lost');
        lostCountEl.textContent = (lostResult.data || []).length;

        if (foundResult.error) throw foundResult.error;
        renderUserItems(foundResult.data || [], myFoundItemsList, 'found');
        foundCountEl.textContent = (foundResult.data || []).length;
    } catch (error) {
        showMessage(profileUpdateMessageDiv, `Error loading your items: ${error.message}`, 'error');
    } finally {
        showLoadingIndicator(myLostItemsList, false);
        showLoadingIndicator(myFoundItemsList, false);
    }
}

function renderUserItems(items, container, type) {
    container.innerHTML = "";
    if (items.length === 0) {
        container.innerHTML = `<p class="no-items-message">You haven't reported any ${type} items yet.</p>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.dataset.itemId = item.id; 
        card.dataset.itemType = type;
        const isResolved = item.status === 'Resolved';
        card.innerHTML = `
            <div class="item-card-content">
                <div class="item-image"><img src="${item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg'}" alt="${item.name}"></div>
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="item-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatDate(type === 'lost' ? item.date_lost : item.date_found)}</span>
                        <span class="status ${isResolved ? 'resolved' : 'active'}"><i class="fas fa-info-circle"></i> Status: ${item.status}</span>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                ${isResolved
                    ? `<button class="btn btn-action btn-reactivate" data-action="reactivate"><i class="fas fa-undo-alt"></i> Reactivate</button>`
                    : `<button class="btn btn-action btn-edit" data-action="edit"><i class="fas fa-edit"></i> Edit</button>
                       <button class="btn btn-action btn-resolve" data-action="resolve"><i class="fas fa-check-circle"></i> Mark Resolved</button>`
                }
            </div>
        `;
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
    observeElements(container.querySelectorAll('.item-card'));
}

async function handleItemAction(e) {
    const button = e.target.closest('.btn-action');
    if (!button) return;
    const card = button.closest('.item-card');
    const { itemId, itemType } = card.dataset;
    const action = button.dataset.action;

    const table = itemType === 'lost' ? 'lost_items' : 'found_items';
    const { data: itemData, error: fetchError } = await supabase.from(table).select('*').eq('id', itemId).single();
    if(fetchError) return showMessage(profileUpdateMessageDiv, `Error fetching item details: ${fetchError.message}`, 'error');

    if (action === 'edit') {
        populateAndOpenEditModal(itemData, itemType);
    } else if (action === 'resolve' && itemType === 'found') {
        populateAndOpenReclaimModal(itemData);
    } else {
        const newStatus = action === 'resolve' ? 'Resolved' : 'Active';
        setLoading(button, true);
        try {
            const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', itemId);
            if (error) throw error;
            showMessage(profileUpdateMessageDiv, `Item status updated successfully!`, 'success');
            await loadUserItems();
        } catch(error) {
            showMessage(profileUpdateMessageDiv, `Error updating status: ${error.message}`, 'error');
        } finally {
            setLoading(button, false);
        }
    }
}

// --- Edit Item Modal Logic ---
function populateAndOpenEditModal(item, type) {
    editFormMessage.className = 'form-message';
    editForm.reset();
    editForm.querySelector('#editItemId').value = item.id;
    editForm.querySelector('#editItemType').value = type;
    editForm.querySelector('#editItemName').value = item.name;
    editForm.querySelector('#editDescription').value = item.description;
    editForm.querySelector('#editCampus').value = item.campus;
    editForm.querySelector('#editContact').value = item.contact;
    const locationInput = editForm.querySelector('#editLocation');
    const dateInput = editForm.querySelector('#editDate');
    if (type === 'lost') {
        editForm.querySelector('#editLocationLabel').textContent = 'Last Seen Location*';
        locationInput.value = item.last_seen;
        editForm.querySelector('#editDateLabel').textContent = 'Date Lost*';
        dateInput.value = formatDate(item.date_lost, true);
    } else {
        editForm.querySelector('#editLocationLabel').textContent = 'Location Found*';
        locationInput.value = item.location_found;
        editForm.querySelector('#editDateLabel').textContent = 'Date Found*';
        dateInput.value = formatDate(item.date_found, true);
    }
    editModal.classList.add('active');
}

async function handleItemUpdateSubmit(e) {
    e.preventDefault();
    const saveBtn = editForm.querySelector('#saveChangesBtn_modal');
    setLoading(saveBtn, true);

    const id = editForm.querySelector('#editItemId').value;
    const type = editForm.querySelector('#editItemType').value;
    const table = type === 'lost' ? 'lost_items' : 'found_items';
    const updatedData = {
        name: editForm.querySelector('#editItemName').value,
        description: editForm.querySelector('#editDescription').value,
        campus: editForm.querySelector('#editCampus').value,
        contact: editForm.querySelector('#editContact').value,
    };
    if(type === 'lost') {
        updatedData.last_seen = editForm.querySelector('#editLocation').value;
        updatedData.date_lost = editForm.querySelector('#editDate').value;
    } else {
        updatedData.location_found = editForm.querySelector('#editLocation').value;
        updatedData.date_found = editForm.querySelector('#editDate').value;
    }
    try {
        const { error } = await supabase.from(table).update(updatedData).eq('id', id);
        if (error) throw error;
        await loadUserItems();
        closeAllModals();
        showMessage(profileUpdateMessageDiv, 'Item updated successfully!', 'success');
    } catch(error) {
        showMessage(editFormMessage, `Error: ${error.message}`, 'error');
    } finally {
        setLoading(saveBtn, false);
    }
}

// --- Reclaim Item Modal Logic (CORRECTED) ---
function populateAndOpenReclaimModal(item) {
    reclaimFormMessage.className = 'form-message';
    reclaimForm.reset();

    // Populate hidden fields with finder and item info
    document.getElementById('reclaimFoundItemId').value = item.id;
    document.getElementById('reclaimFinderUserId').value = currentUser.id;
    document.getElementById('reclaimFinderName').value = currentUser.user_metadata?.full_name || 'N/A';
    document.getElementById('reclaimFinderContact').value = item.contact;
    document.getElementById('reclaimItemName').value = item.name;
    
    reclaimModal.classList.add('active');
}

async function handleReclaimSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitReclaimBtn');
    setLoading(submitBtn, true);

    // 1. Get all form data
    const found_item_id = document.getElementById('reclaimFoundItemId').value;
    const idImageFile = document.getElementById('reclaimClaimerId').files[0];

    const reclaimData = {
        found_item_id: found_item_id,
        finder_user_id: document.getElementById('reclaimFinderUserId').value,
        finder_name: document.getElementById('reclaimFinderName').value,
        finder_contact: document.getElementById('reclaimFinderContact').value,
        item_name: document.getElementById('reclaimItemName').value,
        claimer_name: document.getElementById('reclaimClaimerName').value.trim(),
        claimer_contact_phone: document.getElementById('reclaimClaimerPhone').value.trim(),
        claimer_contact_email: document.getElementById('reclaimClaimerEmail').value.trim(),
        notes: document.getElementById('reclaimNotes').value.trim(),
    };
    
    if (!reclaimData.claimer_name || !reclaimData.claimer_contact_phone || !reclaimData.claimer_contact_email || !idImageFile) {
        showMessage(reclaimFormMessage, 'Please fill all required fields, including the ID photo.', 'error');
        setLoading(submitBtn, false);
        return;
    }

    try {
        // 2. Upload the ID image to Supabase Storage
        const filePath = `public/${found_item_id}-${Date.now()}-${idImageFile.name}`;
        const { error: uploadError } = await supabase.storage
            .from('reclaimed-items') // <-- CORRECTED BUCKET NAME
            .upload(filePath, idImageFile);

        if (uploadError) throw uploadError;

        // 3. Get the public URL of the uploaded image
        const { data: urlData } = supabase.storage
            .from('reclaimed-items') // <-- CORRECTED BUCKET NAME
            .getPublicUrl(filePath);

        reclaimData.claimer_id_image_url = urlData.publicUrl;

        // 4. Insert the record into the 'reclaimed_items' table
        const { error: insertError } = await supabase.from('reclaimed_items').insert(reclaimData);
        if (insertError) throw insertError;
        
        // 5. Update the original found_item's status to 'Resolved'
        const { error: updateError } = await supabase.from('found_items').update({ status: 'Resolved' }).eq('id', found_item_id);
        if (updateError) throw updateError;
        
        // 6. Success
        await loadUserItems();
        closeAllModals();
        showMessage(profileUpdateMessageDiv, `Item successfully marked as resolved and claim recorded.`, 'success');
        
    } catch (error) {
        showMessage(reclaimFormMessage, `Error processing claim: ${error.message}`, 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}


function closeAllModals() {
    editModal.classList.remove("active");
    reclaimModal.classList.remove("active");
}

// --- Consistent Navigation & Animation ---
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
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-page');
        if (link.href.includes('profile.html')) link.classList.add('active-page');
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