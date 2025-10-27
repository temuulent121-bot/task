import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Config ---
const SUPABASE_URL = "https://uzrhdhfhavvajvvozsur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cmhkaGZoYXZ2YWp2dm96c3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAwOTksImV4cCI6MjA1Nzk3NjA5OX0.uhZnLUcdhHfM66jLe462yerHT7nitkecDaDcJNsNSZk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const adminActionMessageDiv = document.getElementById('adminActionMessage');
const logoutButton = document.getElementById('logoutButton');
const themeToggle = document.getElementById('themeToggle');
const adminSidebarLinks = document.querySelectorAll('.admin-nav-link');
const adminContentSections = document.querySelectorAll('.admin-section');
const statCardGrid = document.querySelector('.stat-card-grid');
// Dashboard
const statLostActive = document.getElementById('statLostActive');
const statFoundActive = document.getElementById('statFoundActive');
const statUnreadMessages = document.getElementById('statUnreadMessages');
const recentLostList = document.getElementById('recentLostList');
const recentFoundList = document.getElementById('recentFoundList');
// Item Management
const lostSearch = document.getElementById('lostSearch');
const lostStatusFilter = document.getElementById('lostStatusFilter');
const lostItemsTableBody = document.getElementById('lostItemsTableBody');
const foundSearch = document.getElementById('foundSearch');
const foundStatusFilter = document.getElementById('foundStatusFilter');
const foundItemsTableBody = document.getElementById('foundItemsTableBody');
// Item Tracker
const itemTrackerSearch = document.getElementById('itemTrackerSearch');
const itemTrackerDateFilter = document.getElementById('itemTrackerDateFilter');
const itemTrackerGrid = document.getElementById('itemTrackerGrid');
// Message Section
const contactSearch = document.getElementById('contactSearch');
const readStatusFilter = document.getElementById('readStatusFilter');
const messageList = document.getElementById('messageList');
const messageViewer = document.getElementById('messageViewer');
const viewerEmptyState = messageViewer?.querySelector('.viewer-empty-state');
const viewerContent = messageViewer?.querySelector('.viewer-content');
const viewMessageSubject = document.getElementById('viewMessageSubject');
const viewMessageName = document.getElementById('viewMessageName');
const viewMessageEmail = document.getElementById('viewMessageEmail');
const viewMessageDate = document.getElementById('viewMessageDate');
const viewMessageBody = document.getElementById('viewMessageBody');
const toggleReadBtn = document.getElementById('toggleReadBtn');
const deleteMessageBtn = document.getElementById('deleteMessageBtn');

// --- Global State ---
let allLostItems = [], allFoundItems = [], allTrackedItems = [], allContactMessages = [];
let activeMessageId = null;
let adminActionTimer;

// --- Helper Functions ---
const formatDate = (ds, iT=false) => { try { const d = new Date(ds); if(isNaN(d.getTime())) return "N/A"; return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',hour:iT?'2-digit':undefined,minute:iT?'2-digit':undefined}).format(d); } catch(e){ return "N/A"; } };
const applyTheme = (theme) => document.documentElement.className = theme === 'light' ? 'light-theme' : '';
const setThemePreference = (theme) => { applyTheme(theme); try { localStorage.setItem('theme', theme); } catch (e) { console.error("Theme save error:", e); } };
function showAdminActionMessage(message, type = 'success', duration = 4000) {
    if (!adminActionMessageDiv) return;
    adminActionMessageDiv.textContent = message;
    adminActionMessageDiv.className = `form-message ${type} show`;
    clearTimeout(adminActionTimer);
    adminActionTimer = setTimeout(() => { adminActionMessageDiv.classList.remove('show'); }, duration);
}

// --- Authentication & Initialization ---
async function checkAdminAccess() { const { data: { user } } = await supabase.auth.getUser(); if (!user) { window.location.href = 'login.html'; return false; } if (user.user_metadata?.role !== 'admin') { alert("Access Denied."); window.location.href = 'home.html'; return false; } return true; }
async function handleLogout() { await supabase.auth.signOut(); window.location.href = 'login.html'; }

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await checkAdminAccess())) return;
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    if (themeToggle) themeToggle.checked = savedTheme === 'dark';
    setupEventListeners();
    initializeAdminSidebar();
    loadDashboardData();
});

function setupEventListeners() {
    themeToggle?.addEventListener('change', () => setThemePreference(themeToggle.checked ? 'dark' : 'light'));
    logoutButton?.addEventListener('click', handleLogout);
    lostSearch?.addEventListener('input', () => filterAndRenderItemsTable('lost'));
    lostStatusFilter?.addEventListener('change', () => filterAndRenderItemsTable('lost'));
    foundSearch?.addEventListener('input', () => filterAndRenderItemsTable('found'));
    foundStatusFilter?.addEventListener('change', () => filterAndRenderItemsTable('found'));
    itemTrackerSearch?.addEventListener('input', filterAndRenderTrackerItems);
    itemTrackerDateFilter?.addEventListener('change', filterAndRenderTrackerItems);
    contactSearch?.addEventListener('input', filterAndRenderContactMessages);
    readStatusFilter?.addEventListener('change', filterAndRenderContactMessages);
    statCardGrid?.addEventListener('click', handleStatCardClick);
    itemTrackerGrid.addEventListener('click', handleTrackerCardActions);
    messageList.addEventListener('click', handleMessageListClick);
    toggleReadBtn.addEventListener('click', handleToggleReadClick);
    deleteMessageBtn.addEventListener('click', handleDeleteMessageClick);
}

// --- Navigation ---
function initializeAdminSidebar() {
    const dataLoaders = {
        'dashboard-section': loadDashboardData,
        'manage-lost-section': () => loadManageItems('lost'),
        'manage-found-section': () => loadManageItems('found'),
        'item-tracker-section': loadItemTrackerData,
        'manage-contact-section': loadContactMessages,
    };
    const hasLoaded = {'dashboard-section': true}; // Dashboard loads initially

    adminSidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            adminSidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            adminContentSections.forEach(s => s.classList.toggle('active', s.id === sectionId));
            if (!hasLoaded[sectionId] && dataLoaders[sectionId]) {
                dataLoaders[sectionId]();
                hasLoaded[sectionId] = true;
            }
        });
    });
}
function handleStatCardClick(e) { const card = e.target.closest('.clickable-stat-card'); if (card?.dataset.section) document.querySelector(`.admin-nav-link[data-section="${card.dataset.section}"]`)?.click(); }

// --- Dashboard Logic ---
async function loadDashboardData() {
    try {
        const [lost, found, messages, recentLost, recentFound] = await Promise.all([
            supabase.from('lost_items').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
            supabase.from('found_items').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
            supabase.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('is_read', false),
            supabase.from('lost_items').select('name, created_at').order('created_at', { ascending: false }).limit(5),
            supabase.from('found_items').select('name, created_at').order('created_at', { ascending: false }).limit(5)
        ]);
        statLostActive.textContent = lost.count ?? 0;
        statFoundActive.textContent = found.count ?? 0;
        statUnreadMessages.textContent = messages.count ?? 0;
        renderRecentItems(recentLost.data, recentLostList);
        renderRecentItems(recentFound.data, recentFoundList);
    } catch (error) { console.error("Error loading dashboard data:", error); }
}
function renderRecentItems(items, listEl) { listEl.innerHTML = (items && items.length) ? items.map(item => `<li><strong>${item.name || 'N/A'}</strong> on ${formatDate(item.created_at)}</li>`).join('') : `<li class="no-items-message">No recent items.</li>`; }

// --- Item Management ---
async function loadManageItems(type) {
    const tableBody = type === 'lost' ? lostItemsTableBody : foundItemsTableBody;
    tableBody.innerHTML = `<tr><td colspan="5" class="loading-placeholder">Loading items...</td></tr>`;
    try {
        const tableName = type === 'lost' ? 'lost_items' : 'found_items';
        const { data, error } = await supabase.from(tableName).select(`*`).order('created_at', { ascending: false });
        if (error) throw error;
        if (type === 'lost') allLostItems = data || []; else allFoundItems = data || [];
        filterAndRenderItemsTable(type);
    } catch (error) { tableBody.innerHTML = `<tr><td colspan="5" class="error-text">Failed to load items.</td></tr>`; }
}
function filterAndRenderItemsTable(type) {
    const sourceData = type === 'lost' ? allLostItems : allFoundItems;
    const searchTerm = (type === 'lost' ? lostSearch : foundSearch).value.toLowerCase();
    const status = (type === 'lost' ? lostStatusFilter : foundStatusFilter).value;
    const filtered = sourceData.filter(item => {
        const matchesStatus = !status || item.status === status;
        const matchesSearch = !searchTerm || ['name', 'campus', 'contact'].some(prop => item[prop]?.toLowerCase().includes(searchTerm));
        return matchesStatus && matchesSearch;
    });
    renderItemsTable(filtered, type);
}
function renderItemsTable(items, type) {
    const tableBody = type === 'lost' ? lostItemsTableBody : foundItemsTableBody;
    tableBody.innerHTML = (items.length === 0) ? `<tr><td colspan="5" class="no-items-message">No items found.</td></tr>` : items.map(item => `
        <tr>
            <td><img src="${item.image_url || 'https://uzrhdhfhavvajvvozsur.supabase.co/storage/v1/object/public/lost-items/placeholder.jpg'}" alt="${item.name || 'Item'}" class="item-image-small"></td>
            <td>${item.name || 'N/A'}</td>
            <td>${item.campus || 'N/A'}</td>
            <td>${formatDate(type === 'lost' ? item.date_lost : item.date_found)}</td>
            <td><span class="item-status ${item.status?.toLowerCase()}">${item.status || 'N/A'}</span></td>
        </tr>`).join('');
}

// --- Item Tracker ---
async function loadItemTrackerData() {
    itemTrackerGrid.innerHTML = `<div class="loading-placeholder">Loading...</div>`;
    try {
        const { data, error } = await supabase.from('reclaimed_items').select(`*, found_items (name, campus)`).order('created_at', { ascending: false });
        if (error) throw error;
        allTrackedItems = data || [];
        filterAndRenderTrackerItems();
    } catch (error) { itemTrackerGrid.innerHTML = `<div class="error-text">Failed to load items.</div>`; }
}
function filterAndRenderTrackerItems() {
    const searchTerm = itemTrackerSearch.value.trim().toLowerCase();
    const dateFilter = itemTrackerDateFilter.value;
    const filtered = allTrackedItems.filter(item => {
        const matchesDate = !dateFilter || item.created_at.startsWith(dateFilter);
        const matchesSearch = !searchTerm || [item.found_item_id?.toString(), item.found_items?.name, item.finder_nametext, item.claimer_name, item.notes].some(f => f?.toLowerCase().includes(searchTerm));
        return matchesDate && matchesSearch;
    });
    renderItemTrackerCards(filtered, itemTrackerGrid);
}
function renderItemTrackerCards(items, grid) {
    grid.innerHTML = "";
    if (items.length === 0) { grid.innerHTML = `<div class="no-items-message">No items match criteria.</div>`; return; }
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tracker-card';
        card.innerHTML = `
            <div class="tracker-card-header"><h3>${item.found_items?.name||'Item Missing'}</h3><div class="item-id-wrapper"><span>Item ID: ${item.found_item_id}</span><button class="copy-btn" title="Copy ID" data-action="copy-id"><i class="fas fa-copy"></i></button></div></div>
            <div class="tracker-card-body"><div class="info-column"><h4><i class="fas fa-user-check"></i> Finder</h4><dl class="info-field"><dt>Name</dt><dd>${item.finder_nametext||'N/A'}</dd></dl><dl class="info-field"><dt>Contact</dt><dd><a href="mailto:${item.finder_contact}">${item.finder_contact||'N/A'}</a></dd></dl></div><div class="info-column"><h4><i class="fas fa-user-tag"></i> Claimer</h4><dl class="info-field"><dt>Name</dt><dd>${item.claimer_name||'N/A'}</dd></dl><dl class="info-field"><dt>Contact</dt><dd><a href="mailto:${item.claimer_contact_email}">${item.claimer_contact_email||'N/A'}</a></dd></dl></div><div class="info-column"><h4><i class="fas fa-calendar-check"></i> Transaction</h4><dl class="info-field"><dt>Reclaimed On</dt><dd>${formatDate(item.created_at,true)}</dd></dl><dl class="info-field"><dt>Claimer ID</dt><dd><a href="${item.claimer_id_image_url}" target="_blank" rel="noopener noreferrer" class="btn-view-id">View ID Image</a></dd></dl></div></div>
            ${item.notes?`<div class="tracker-card-footer"><details class="notes-details"><summary class="notes-toggle">View Notes</summary><div class="notes-content">${item.notes}</div></details></div>`:''}
        `;
        grid.appendChild(card);
    });
}
function handleTrackerCardActions(e) { if (e.target.closest('[data-action="copy-id"]')) { const id = e.target.closest('.item-id-wrapper').querySelector('span').textContent.replace('Item ID: ','').trim(); navigator.clipboard.writeText(id).then(()=>showAdminActionMessage(`Copied: ${id}`)).catch(()=>showAdminActionMessage('Copy failed.','error'));}}

// --- Contact Message Logic ---
async function loadContactMessages() {
    messageList.innerHTML = `<li class="loading-placeholder">Loading...</li>`;
    try {
        const { data, error } = await supabase.from('contact_submissions').select('*').order('submitted_at', { ascending: false });
        if (error) throw error;
        allContactMessages = data || [];
        filterAndRenderContactMessages();
    } catch (error) { messageList.innerHTML = `<li class="error-text">Failed to load.</li>`; }
}

function filterAndRenderContactMessages() {
    const searchTerm = contactSearch.value.toLowerCase();
    const readStatus = readStatusFilter.value;
    const filtered = allContactMessages.filter(msg => {
        const matchesRead = !readStatus || msg.is_read.toString() === readStatus;
        const matchesSearch = !searchTerm || ['name','email','subject','message'].some(prop => msg[prop]?.toLowerCase().includes(searchTerm));
        return matchesRead && matchesSearch;
    });
    renderMessageList(filtered);
    // FIXED: Use non-strict '==' to avoid type issues with activeMessageId
    const activeMessageIsVisible = activeMessageId && filtered.some(m => m.id == activeMessageId);
    if (!activeMessageIsVisible) {
        displayMessage(filtered.length > 0 ? filtered[0].id : null);
    }
}

function renderMessageList(messages) {
    messageList.innerHTML = "";
    if (messages.length === 0) { messageList.innerHTML = `<li class="no-items-message">No messages found.</li>`; return; }
    messages.forEach(msg => {
        const li = document.createElement('li');
        li.className = 'message-summary';
        li.dataset.messageId = msg.id;
        if (!msg.is_read) li.classList.add('unread');
        // FIXED: Use non-strict '==' to avoid type issues with activeMessageId
        if (msg.id == activeMessageId) li.classList.add('active');
        li.innerHTML = `${!msg.is_read ? '<div class="unread-indicator"></div>' : ''}<div class="sender-name">${msg.name}</div><div class="message-subject">${msg.subject}</div><div class="message-date">${formatDate(msg.submitted_at)}</div>`;
        messageList.appendChild(li);
    });
}

function handleMessageListClick(e) {
    const targetLi = e.target.closest('.message-summary');
    if (targetLi?.dataset.messageId) {
        // FIXED: Pass the ID as a string, no need for parseInt
        displayMessage(targetLi.dataset.messageId);
    }
}

async function displayMessage(messageId) {
    activeMessageId = messageId;
    
    // FIXED: Use non-strict '==' to correctly toggle the active class regardless of type
    messageList.querySelectorAll('.message-summary').forEach(li => li.classList.toggle('active', li.dataset.messageId == messageId));

    // FIXED: Use non-strict '==' to find the message, preventing type mismatch errors
    const message = allContactMessages.find(m => m.id == messageId);

    if (!message) {
        viewerContent.style.display = 'none';
        viewerEmptyState.style.display = 'flex';
        activeMessageId = null; // Clear the active ID if no message is found
        return;
    }

    viewerEmptyState.style.display = 'none';
    viewMessageSubject.textContent = message.subject || '[No Subject]';
    viewMessageName.textContent = message.name || 'N/A';
    viewMessageEmail.textContent = message.email || 'N/A';
    viewMessageEmail.href = `mailto:${message.email}`;
    viewMessageDate.textContent = formatDate(message.submitted_at, true);
    viewMessageBody.textContent = message.message || '[This message has no content]';
    toggleReadBtn.innerHTML = `<i class="fas ${message.is_read ? 'fa-envelope-open' : 'fa-envelope'}"></i> ${message.is_read ? 'Mark as Unread' : 'Mark as Read'}`;
    viewerContent.style.display = 'block';

    if (!message.is_read) {
        await toggleMessageReadStatus(messageId, true, false);
    }
}

async function handleToggleReadClick() {
    if (activeMessageId === null) return;
    const message = allContactMessages.find(m => m.id == activeMessageId); // FIXED: Use '=='
    if (message) await toggleMessageReadStatus(activeMessageId, !message.is_read, true);
}

async function handleDeleteMessageClick() {
    if (activeMessageId === null) return;
    if (!confirm("Are you sure you want to permanently delete this message?")) return;
    try {
        await supabase.from('contact_submissions').delete().eq('id', activeMessageId);
        // FIXED: Use '!=' for robust filtering
        allContactMessages = allContactMessages.filter(m => m.id != activeMessageId); 
        const nextMessageId = allContactMessages.length > 0 ? allContactMessages[0].id : null;
        activeMessageId = null; // Clear active ID before re-rendering
        filterAndRenderContactMessages();
        displayMessage(nextMessageId); // Display the next message or empty state
        showAdminActionMessage("Message deleted successfully.", "success");
    } catch (error) { showAdminActionMessage(`Error deleting message: ${error.message}`, "error"); }
}

async function toggleMessageReadStatus(messageId, newStatus, showNotification = true) {
    try {
        const { error } = await supabase.from('contact_submissions').update({ is_read: newStatus }).eq('id', messageId);
        if (error) throw error;
        
        // FIXED: Use '==' to find the correct message to update
        const msgIndex = allContactMessages.findIndex(m => m.id == messageId);
        if (msgIndex > -1) allContactMessages[msgIndex].is_read = newStatus;
        
        const listItem = messageList.querySelector(`[data-message-id='${messageId}']`);
        if(listItem) listItem.classList.toggle('unread', !newStatus);
        
        // FIXED: Use '=='
        if (messageId == activeMessageId) {
            toggleReadBtn.innerHTML = `<i class="fas ${newStatus ? 'fa-envelope-open' : 'fa-envelope'}"></i> ${newStatus ? 'Mark as Unread' : 'Mark as Read'}`;
        }
        
        loadDashboardData(); // Update dashboard stats
        if(showNotification) showAdminActionMessage(`Message marked as ${newStatus ? 'Read' : 'Unread'}.`, 'success');
    } catch (error) { showAdminActionMessage(`Error updating message status: ${error.message}`, "error"); }
}