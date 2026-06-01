// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2ed7p5iIOcRNvOErrPcdSoJYrXH4vZIc",
  authDomain: "inzu-home.firebaseapp.com",
  databaseURL: "https://inzu-home-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "inzu-home",
  storageBucket: "inzu-home.firebasestorage.app",
  messagingSenderId: "553581277749",
  appId: "1:553581277749:web:d78a0fcc231f720e1a777c",
  measurementId: "G-1CTCRL7LM3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const db = firebase.firestore(); // Firestore as backup
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Visual Sync Status Bar
function updateSyncStatus(status) {
    const syncStatus = document.getElementById('syncStatus');
    if (!syncStatus) return;
    
    // Remove all status classes
    syncStatus.classList.remove('syncing', 'synced', 'error');
    
    // Update status
    syncStatus.classList.add(status);
    
    // Update visual indicator
    const progress = syncStatus.querySelector('.sync-progress');
    if (progress) {
        switch (status) {
            case 'syncing':
                progress.style.width = '50%';
                progress.style.background = '#f59e0b';
                break;
            case 'synced':
                progress.style.width = '100%';
                progress.style.background = '#10b981';
                break;
            case 'error':
                progress.style.width = '100%';
                progress.style.background = '#ef4444';
                break;
        }
    }
    
    // Auto-hide synced status after 2 seconds
    if (status === 'synced') {
        setTimeout(() => {
            syncStatus.classList.remove('synced');
        }, 2000);
    }
    
    // Auto-hide error status after 3 seconds
    if (status === 'error') {
        setTimeout(() => {
            syncStatus.classList.remove('error');
        }, 3000);
    }
}

// Toast Notification System (for important actions only)
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">×</span>
    `;

    // Add to container
    container.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

// Replace showNotification with modern toast
function showNotification(message, type = 'info') {
    showToast(message, type);
}

// Modern confirm dialog
function showConfirm(message, onConfirm, onCancel) {
    const confirmed = confirm(message);
    if (confirmed && onConfirm) onConfirm();
    if (!confirmed && onCancel) onCancel();
    return confirmed;
}

// Data storage
let data = {
    properties: [],
    selectedPropertyId: null
};

let isOnline = navigator.onLine;
let hasSyncedOnce = false;
let currentUser = null;

// Edit state variables
let editingPropertyId = null;
window.editingTenantId = null;
window.editingMonthlyId = null;
window.editingExpenseId = null;
window.editingMoveOutId = null;
window.editingQueryId = null;

// File storage
window.existingLeaseFiles = [];
window.existingIdFiles = [];
window.idDocumentMode = 'new';

// Form state variables
let tenantFormInitialState = '';
let hasTenantFormChanged = false;
let propertyFormInitialState = '';
let hasPropertyFormChanged = false;
let monthlyFormInitialState = '';
let hasMonthlyFormChanged = false;
let expenseFormInitialState = '';
let hasExpenseFormChanged = false;
let moveOutFormInitialState = '';
let hasMoveOutFormChanged = false;

// Original data for comparison
window.originalTenantData = null;
window.originalMonthlyData = null;
window.originalExpenseData = null;
window.originalMoveOutData = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Initializing app...');
    
    // Handle redirect result for mobile sign-in
    firebase.auth().getRedirectResult().then((result) => {
        if (result.user) {
            console.log('🔐 Mobile redirect sign-in successful:', result.user.email);
            showNotification(`Welcome, ${result.user.displayName || result.user.email}!`);
        } else if (result.credential) {
            console.log('🔐 Redirect result with credential but no user');
        }
    }).catch((error) => {
        console.error('🔐 Redirect result error:', error);
        if (error.code !== 'auth/no-auth-in-progress') {
            let errorMsg = 'Login failed';
            if (error.code === 'auth/redirect-cancelled-by-user') {
                errorMsg = 'Sign-in was cancelled.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            showNotification(errorMsg);
        }
    });
    
    // Check authentication status
    checkAuthStatus();
    
    // Initialize forms
    initializeForms();
    
    // Handle shared text on app load
    handleSharedText();
    
    console.log('✅ App initialization complete');
});

// Initialize forms and event listeners
function initializeForms() {
    console.log('🔧 DOM loaded, initializing forms...');
    
    // Check if elements exist before adding listeners
    const addTenantForm = document.getElementById('addTenantForm');
    const tenantForm = document.getElementById('tenantForm');
    const propertyEditForm = document.getElementById('propertyEditForm');
    
    if (addTenantForm) {
        console.log('🔧 addTenantForm found: true');
        // Add tenant form event listener
        addTenantForm.addEventListener('submit', addTenant);
    }
    
    if (tenantForm) {
        console.log('🔧 tenantForm found: true');
        // Tenant form event listener
        tenantForm.addEventListener('submit', saveTenant);
    }
    
    if (propertyEditForm) {
        console.log('🔧 propertyEditForm found: true');
        // Property edit form event listeners
        const propertyFields = propertyEditForm.querySelectorAll('input, select, textarea');
        propertyFields.forEach(field => {
            field.addEventListener('input', () => {
                const saveBtn = document.getElementById('updatePropertyBtn');
                if (saveBtn) saveBtn.disabled = false;
            });
        });
    }
    
    // Other button event listeners
    const monthlyCancelBtn = document.getElementById('monthlyCancelBtn');
    if (monthlyCancelBtn) {
        console.log('🔧 monthlyCancelBtn found: true');
        monthlyCancelBtn.addEventListener('click', cancelMonthlyEdit);
    }
    
    console.log('🚀 Event listeners initialization starting...');
}

// Check authentication status
function checkAuthStatus() {
    console.log('🔐 Checking auth status...');
    
    firebase.auth().onAuthStateChanged((user) => {
        console.log('🔐 Auth state changed:', user ? 'User logged in' : 'No user');
        
        if (user) {
            currentUser = user;
            console.log('🔐 User ID:', user.uid);
            console.log('🔐 User email:', user.email);
            
            // For returning users, hide splash and show app
            hideSplash();
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('appContent').style.display = 'block';
            
            // Update user info in slideout
            updateSlideoutUserInfo();
            
            // Load data and setup app
            loadData().then(() => {
                
                // Initialize navigation to hide tabs
                initializeNavigation();
                
                // After data is loaded and navigation is initialized, update UI
                renderAllEntries();
                updateTenantSelects();
                updateSummary();
                updateSyncStatus('synced');
            }).catch((error) => {
                console.error('❌ Error loading data:', error);
                updateSyncStatus('error');
            });
            
            cleanupInvalidTenants();
            // Don't initialize forms here - do it in DOMContentLoaded
            setDefaultDates();
            initializePWA();
            setupRealtimeSync();
        } else {
            currentUser = null;
            console.log('🔐 No user - showing auth container, hiding app');
            // Show auth container for sign-in, hide app content
            document.getElementById('authContainer').style.display = 'flex';
            document.getElementById('appContent').style.display = 'none';
        }
    });
}

// Google Sign In
async function loginWithGoogle() {
    try {
        showNotification('Opening Google Sign-In...');
        console.log('🔐 Attempting Google Sign-In...');
        
        // Check if mobile device and use redirect instead of popup
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Ensure auth persistence is set to local so user remains signed in after refresh
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        let result;
        if (isMobile) {
            console.log('📱 Mobile device detected, using redirect sign-in');
            await firebase.auth().signInWithRedirect(googleProvider);
            // The redirect will handle the rest
            return;
        } else {
            console.log('💻 Desktop detected, using popup sign-in');
            result = await firebase.auth().signInWithPopup(googleProvider);
        }
        
        console.log('🔐 Sign-In successful:', result.user.email);
        showNotification(`Welcome, ${result.user.displayName || result.user.email}!`);
    } catch (error) {
        console.error('Login error details:', error && error.code, error && error.message);

        // Provide helpful error messages
        let errorMsg = 'Login failed';
        if (error && error.code === 'auth/operation-not-allowed') {
            errorMsg = 'Google Sign-In is not enabled. Please check Firebase console.';
        } else if (error && error.code === 'auth/popup-blocked') {
            errorMsg = 'Pop-up was blocked. Please allow pop-ups and try again.';
        } else if (error && error.code === 'auth/popup-closed-by-user') {
            errorMsg = 'Sign-in was cancelled.';
        } else if (error && error.code === 'auth/redirect-cancelled-by-user') {
            errorMsg = 'Sign-in was cancelled.';
        } else if (error && error.message) {
            errorMsg = error.message;
        }

        showNotification(errorMsg);
    }
}

// Logout
async function logoutUser() {
    if (confirm('Are you sure you want to logout? Your data is saved to your Google account.')) {
        try {
            await firebase.auth().signOut();
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Logout failed');
        }
    }
}

// Setup real-time sync with Firebase
async function setupRealtimeSync() {
    if (!currentUser) return;
    const dataRef = database.ref(`users/${currentUser.uid}/rentalData`);

    console.log(' Setting up enhanced realtime sync...');
    
    // Always setup realtime sync for automatic updates
    dataRef.on('value', (snapshot) => {
        const firebaseData = snapshot.val();
        if (firebaseData) {
            // Check if data actually changed
            if (JSON.stringify(firebaseData) !== JSON.stringify(data)) {
                console.log(' Data changed in Firebase, updating local...');
                data = firebaseData;
                renderAllEntries();
                updateTenantSelects();
                updateSummary();
                showNotification('Data automatically synced', 'success');
                updateSyncStatus('synced');
            }
        }
    }, (error) => {
        console.error(' Real-time sync error:', error);
        updateSyncStatus('error');
    });
}

// Load data with proper priority: Firebase → localStorage → empty
async function loadData() {
    console.log('🔄 Loading data with best practices...');
    
    // 1. Try Firebase first (most reliable)
    if (currentUser) {
        console.log('📡 Current user:', currentUser.uid);
        try {
            // Only use user-specific path
            const userDataRef = database.ref(`users/${currentUser.uid}/rentalData`);
            console.log(' Fetching from Firebase path:', `users/${currentUser.uid}/rentalData`);
            const snapshot = await userDataRef.once('value');
            
            console.log(' Firebase user path snapshot exists:', snapshot.exists());
            
            if (snapshot.exists()) {
                console.log('✅ Loaded data from Firebase');
                data = snapshot.val();
                
                // Backup to localStorage for offline access
                localStorage.setItem('inzuData', JSON.stringify(data));
                localStorage.setItem('lastSaved', new Date().toLocaleString());
                
                migrateToHierarchicalStructure();
                console.log('📊 Data loaded:', JSON.stringify(data, null, 2));
                return data;
            } else {
                console.log('📡 No data in Firebase, checking localStorage...');
            }
        } catch (error) {
            console.warn('⚠️ Firebase unavailable, trying localStorage:', error.code, error.message);
        }
    } else {
        console.log('⚠️ No user logged in, skipping Firebase');
    }
    
    // 2. Fallback to localStorage
    try {
        const localData = localStorage.getItem('inzuData');
        if (localData) {
            console.log('✅ Loaded data from localStorage');
            data = JSON.parse(localData);
            
            // Try to sync to Firebase if available
            if (currentUser && data.properties && data.properties.length > 0) {
                console.log('📤 Backing up local data to Firebase...');
                saveToFirebaseOnly(data);
            }
            
            migrateToHierarchicalStructure();
            console.log('📊 Data loaded:', JSON.stringify(data, null, 2));
            return data;
        }
    } catch (error) {
        console.warn('⚠️ localStorage corrupted, starting fresh:', error);
    }
    
    // 3. Start with empty data
    console.log('🆕 Starting with empty data');
    data = { properties: [], selectedPropertyId: null };
    return data;
}

// ===== SAFE TENANT HELPERS =====
function getPropertyOrFail(propertyId) {
    const property = data.properties.find(p => p.id === propertyId);
    if (!property) {
        console.error('❌ Property not found:', propertyId);
        return null;
    }
    
    // Ensure tenants array exists
    if (!Array.isArray(property.tenants)) {
        property.tenants = [];
    }
    
    return property;
}

function findTenantInAllProperties(tenantId) {
    for (const property of data.properties) {
        if (property.tenants) {
            const tenant = property.tenants.find(t => t.id === tenantId);
            if (tenant) {
                return { tenant, property };
            }
        }
    }
    return null;
}

function findTenantInProperty(propertyId, tenantId) {
    const property = getPropertyOrFail(propertyId);
    if (!property) return null;
    
    const tenant = property.tenants.find(t => t.id === tenantId);
    return tenant ? { tenant, property } : null;
}

// ===== CLEAN UP INVALID TENANTS =====
function cleanupInvalidTenants() {
    // Clean up invalid tenants in all properties
    data.properties.forEach(property => {
        if (property.tenants) {
            const originalCount = property.tenants.length;
            property.tenants = property.tenants.filter(tenant => {
                const name = tenant.name && tenant.name.trim() !== '';
                const unit = tenant.unit && tenant.unit.trim() !== '';
                return name && unit;
            });
            
            const removedCount = originalCount - property.tenants.length;
            if (removedCount > 0) {
                console.log(`Removed ${removedCount} invalid tenant(s) missing name or unit from property: ${property.name}`);
                saveData();
            }
        }
    });
}

// Migrate from flat structure to hierarchical structure
function migrateToHierarchicalStructure() {
    // Always use the global data object
    const needsMigration = data;
    const hasOldData = (needsMigration.tenants && needsMigration.tenants.length > 0) ||
                      (needsMigration.monthly && needsMigration.monthly.length > 0) ||
                      (needsMigration.expenses && needsMigration.expenses.length > 0) ||
                      (needsMigration.moveOuts && needsMigration.moveOuts.length > 0) ||
                      (needsMigration.queries && needsMigration.queries.length > 0);
    
    console.log('Checking migration needs...', {
        hasOldData,
        tenants: needsMigration.tenants?.length || 0,
        monthly: needsMigration.monthly?.length || 0,
        expenses: needsMigration.expenses?.length || 0,
        moveOuts: needsMigration.moveOuts?.length || 0,
        queries: needsMigration.queries?.length || 0
    });
    
    if (!hasOldData) {
        console.log('No migration needed - already hierarchical or empty');
        return;
    }
    
    console.log('MIGRATING from flat to hierarchical structure...');
    
    // Ensure properties array exists
    if (!needsMigration.properties) needsMigration.properties = [];
    
    // Create a default property if none exists
    if (needsMigration.properties.length === 0) {
        const defaultProperty = {
            id: Date.now(),
            name: 'Default Property',
            address: 'Default Address',
            type: 'apartment',
            units: 50,
            description: 'Default property for migrated data',
            tenants: [],
            monthly: [],
            expenses: [],
            moveOuts: [],
            queries: [],
            createdAt: new Date().toISOString()
        };
        needsMigration.properties.push(defaultProperty);
        needsMigration.selectedPropertyId = defaultProperty.id;
        console.log('Created default property:', defaultProperty.id);
    }
    
    const defaultPropertyId = needsMigration.properties[0].id;
    console.log('Using property ID for migration:', defaultPropertyId);
    
    // Migrate tenants
    if (needsMigration.tenants && needsMigration.tenants.length > 0) {
        console.log('Migrating', needsMigration.tenants.length, 'tenants');
        needsMigration.properties.forEach(property => {
            property.tenants = property.tenants || [];
        });
        
        needsMigration.tenants.forEach(tenant => {
            const targetPropertyId = tenant.propertyId || defaultPropertyId;
            const property = needsMigration.properties.find(p => p.id === targetPropertyId);
            if (property) {
                property.tenants = property.tenants || [];
                property.tenants.push(tenant);
                console.log('Migrated tenant:', tenant.name, 'to property:', property.name);
            } else {
                console.warn('Property not found for tenant:', targetPropertyId);
            }
        });
        delete needsMigration.tenants;
        console.log('Deleted old tenants array');
    }
    
    // Migrate monthly payments
    if (needsMigration.monthly && needsMigration.monthly.length > 0) {
        console.log('Migrating', needsMigration.monthly.length, 'monthly payments');
        needsMigration.properties.forEach(property => {
            property.monthly = property.monthly || [];
        });
        
        needsMigration.monthly.forEach(payment => {
            const targetPropertyId = payment.propertyId || defaultPropertyId;
            const property = needsMigration.properties.find(p => p.id === targetPropertyId);
            if (property) {
                property.monthly = property.monthly || [];
                property.monthly.push(payment);
            }
        });
        delete needsMigration.monthly;
        console.log('Deleted old monthly array');
    }
    
    // Migrate expenses
    if (needsMigration.expenses && needsMigration.expenses.length > 0) {
        console.log('Migrating', needsMigration.expenses.length, 'expenses');
        needsMigration.properties.forEach(property => {
            property.expenses = property.expenses || [];
        });
        
        needsMigration.expenses.forEach(expense => {
            const targetPropertyId = expense.propertyId || defaultPropertyId;
            const property = needsMigration.properties.find(p => p.id === targetPropertyId);
            if (property) {
                property.expenses = property.expenses || [];
                property.expenses.push(expense);
            }
        });
        delete needsMigration.expenses;
        console.log('Deleted old expenses array');
    }
    
    // Migrate move outs
    if (needsMigration.moveOuts && needsMigration.moveOuts.length > 0) {
        console.log('Migrating', needsMigration.moveOuts.length, 'move outs');
        needsMigration.properties.forEach(property => {
            property.moveOuts = property.moveOuts || [];
        });
        
        needsMigration.moveOuts.forEach(moveOut => {
            const targetPropertyId = moveOut.propertyId || defaultPropertyId;
            const property = needsMigration.properties.find(p => p.id === targetPropertyId);
            if (property) {
                property.moveOuts = property.moveOuts || [];
                property.moveOuts.push(moveOut);
            }
        });
        delete needsMigration.moveOuts;
        console.log('Deleted old moveOuts array');
    }
    
    // Migrate queries
    if (needsMigration.queries && needsMigration.queries.length > 0) {
        console.log('Migrating', needsMigration.queries.length, 'queries');
        needsMigration.properties.forEach(property => {
            property.queries = property.queries || [];
        });
        
        needsMigration.queries.forEach(query => {
            const targetPropertyId = query.propertyId || defaultPropertyId;
            const property = needsMigration.properties.find(p => p.id === targetPropertyId);
            if (property) {
                property.queries = property.queries || [];
                property.queries.push(query);
            }
        });
        delete needsMigration.queries;
        console.log('Deleted old queries array');
    }
    
    console.log('Migration to hierarchical structure completed');
    console.log('Final structure:', JSON.stringify(needsMigration, null, 2));
    
    // Show notification to user
    if (typeof showNotification !== 'undefined') {
        showNotification('🏠 Database structure updated to hierarchical format');
    }
}

// Save data with proper redundancy
function saveData() {
    // 1. Save to localStorage (immediate, reliable)
    try {
        localStorage.setItem('inzuData', JSON.stringify(data));
        console.log(' Data saved to localStorage');
        showNotification(' Data saved to device', 'success', 2000); // Quick confirmation
    } catch (error) {
        console.error(' Failed to save to localStorage:', error);
        showNotification(' Error saving data to device', 'error');
    }
    
    // 2. Save to Firebase in background (async, don't wait)
    if (currentUser) {
        saveToFirebaseOnly(data);
    } else {
        console.log('⚠️ No user logged in - data saved locally only');
        showNotification('⚠️ Please sign in to enable cloud backup', 'warning');
    }
    
    // 3. Update UI
    updateLastSaved();
    updateBackupInfo();
    showSaveIndicator();
}

// Separate Firebase-only save function
async function saveToFirebaseOnly(dataToSave) {
    if (!currentUser) return;
    
    try {
        console.log(' Saving to Firebase...');
        updateSyncStatus('syncing');
        
        // Save to user-specific path only
        const userDataRef = database.ref(`users/${currentUser.uid}/rentalData`);
        await userDataRef.set(dataToSave);
        console.log(' Data saved to Firebase user path');
        
        updateSyncStatus('synced');
        
    } catch (error) {
        console.error(' Firebase save failed:', error);
        updateSyncStatus('error');
        
        // Show appropriate message based on error type
        if (error.code === 'PERMISSION_DENIED') {
            showNotification(' Cloud backup permission issue - Data saved locally', 'warning');
        } else if (error.code === 'unavailable') {
            showNotification(' No internet connection - Data saved locally only', 'info');
        } else {
            showNotification(' Cloud backup failed - Data saved locally', 'warning');
        }
        
        // Show local save success
        setTimeout(() => {
            showNotification(' Data saved successfully to device', 'success');
        }, 2000);
    }
}

// Monitor online/offline status
window.addEventListener('online', () => {
    isOnline = true;
    updateSyncStatus('syncing');
    saveData(); // Sync any offline changes
});

window.addEventListener('offline', () => {
    isOnline = false;
    showNotification('You are offline - changes saved locally');
});

// PWA Auto-Update Detection with User Permission
// Service worker registration is handled in the main DOMContentLoaded listener

// Listen for controlling service worker changes
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed - reloading page');
        window.location.reload();
    });
}

// Check for app updates on page visibility change (when user returns to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.swRegistration) {
        console.log('Page became visible - checking for updates');
        window.swRegistration.update();
    }
});

// Auto-update setting
let autoUpdateEnabled = localStorage.getItem('autoUpdateEnabled') === 'true'; // Default to false (manual updates)

// Toggle auto-update setting
function toggleAutoUpdate() {
    autoUpdateEnabled = !autoUpdateEnabled;
    localStorage.setItem('autoUpdateEnabled', autoUpdateEnabled.toString());
    
    // Update toggle switch UI
    const toggleElement = document.getElementById('autoUpdateToggle');
    if (toggleElement) {
        if (autoUpdateEnabled) {
            toggleElement.classList.add('active');
        } else {
            toggleElement.classList.remove('active');
        }
    }
    
    showNotification(`Auto-update ${autoUpdateEnabled ? 'enabled' : 'disabled'}`, 'info');
}

// Initialize auto-update toggle
function initializeAutoUpdateMenu() {
    const toggleElement = document.getElementById('autoUpdateToggle');
    if (toggleElement) {
        if (autoUpdateEnabled) {
            toggleElement.classList.add('active');
        } else {
            toggleElement.classList.remove('active');
        }
    }
}

// Show update prompt to user
function showUpdatePrompt() {
    // Show update status in menu
    const updateStatus = document.getElementById('updateStatus');
    const updateButton = document.getElementById('updateButton');
    
    if (updateStatus) updateStatus.classList.remove('hidden');
    if (updateButton) updateButton.classList.remove('hidden');
    
    // Check if there's already an update prompt showing
    if (document.querySelector('.update-prompt')) {
        return; // Don't show multiple prompts
    }
    
    // Create update prompt
    const updatePrompt = document.createElement('div');
    updatePrompt.className = 'update-prompt';
    
    if (autoUpdateEnabled) {
        // Auto-update enabled - show countdown
        let countdownSeconds = 10;
        
        updatePrompt.innerHTML = `
            <div class="update-prompt-content">
                <div class="update-prompt-icon">?</div>
                <div class="update-prompt-text">
                    <strong>App Update Available</strong>
                    <p>A new version of Inzu is ready with improvements and bug fixes.</p>
                    <p class="update-countdown">Auto-updating in <span id="updateCountdown">${countdownSeconds}</span> seconds...</p>
                </div>
                <div class="update-prompt-actions">
                    <button class="btn btn-secondary" onclick="dismissUpdate(this)">Later</button>
                    <button class="btn btn-primary" onclick="applyUpdate()">Update Now</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(updatePrompt);
        
        // Start countdown for automatic update
        const countdownInterval = setInterval(() => {
            countdownSeconds--;
            const countdownEl = document.getElementById('updateCountdown');
            if (countdownEl) {
                countdownEl.textContent = countdownSeconds;
            }
            
            if (countdownSeconds <= 0) {
                clearInterval(countdownInterval);
                applyUpdate();
            }
        }, 1000);
        
        // Store interval reference for cleanup
        updatePrompt.countdownInterval = countdownInterval;
    } else {
        // Auto-update disabled - show manual prompt only
        updatePrompt.innerHTML = `
            <div class="update-prompt-content">
                <div class="update-prompt-icon">?</div>
                <div class="update-prompt-text">
                    <strong>App Update Available</strong>
                    <p>A new version of Inzu is ready with improvements and bug fixes.</p>
                    <p>Update when you're ready - your work won't be interrupted.</p>
                </div>
                <div class="update-prompt-actions">
                    <button class="btn btn-secondary" onclick="dismissUpdate(this)">Later</button>
                    <button class="btn btn-primary" onclick="applyUpdate()">Update Now</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(updatePrompt);
    }
    
    // Auto-show the prompt with animation
    setTimeout(() => {
        updatePrompt.classList.add('show');
    }, 100);
}

// Update current version display
async function updateVersionDisplay() {
    const currentVersionEl = document.getElementById('currentVersion');
    const footerVersionEl = document.getElementById('footerVersion');
    
    // Try to get version from service worker first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            const messageChannel = new MessageChannel();
            navigator.serviceWorker.controller.postMessage(
                { type: 'GET_VERSION' },
                [messageChannel.port2]
            );
            
            messageChannel.port1.onmessage = (event) => {
                if (event.data.version) {
                    if (currentVersionEl) currentVersionEl.textContent = event.data.version;
                    if (footerVersionEl) footerVersionEl.textContent = event.data.version;
                }
            };
        } catch (error) {
            console.log('Could not get version from service worker:', error);
        }
    }
    
    // Fallback to hardcoded version
    const fallbackVersion = '1.0.0';
    if (currentVersionEl && currentVersionEl.textContent === fallbackVersion) {
        currentVersionEl.textContent = fallbackVersion;
    }
    if (footerVersionEl && footerVersionEl.textContent === fallbackVersion) {
        footerVersionEl.textContent = fallbackVersion;
    }
}

// Simple diagnostic to check action row state
function checkActionRows() {
    console.log('🔍 === ACTION ROWS DIAGNOSTIC ===');
    const allTabs = ['tenants', 'monthly', 'expenses', 'moveouts2', 'moveouts', 'queries'];
    
    allTabs.forEach(tabName => {
        const tab = document.getElementById(tabName);
        if (tab) {
            const actionRow = tab.querySelector('.action-buttons-row');
            const button = tab.querySelector('.toggle-btn');
            
            console.log(`📋 Tab: ${tabName}`);
            console.log(`  - Action row exists: ${!!actionRow}`);
            console.log(`  - Action row hidden: ${actionRow ? actionRow.classList.contains('hidden') : 'N/A'}`);
            console.log(`  - Action row display: ${actionRow ? window.getComputedStyle(actionRow).display : 'N/A'}`);
            console.log(`  - Button exists: ${!!button}`);
            console.log(`  - Button display: ${button ? window.getComputedStyle(button).display : 'N/A'}`);
            console.log(`  - Button visible: ${button ? window.getComputedStyle(button).visibility : 'N/A'}`);
            console.log('');
        }
    });
}

// Expose diagnostic function
window.checkActionRows = checkActionRows;

// Add this to script.js to diagnose the button visibility issue
function diagnoseButtonVisibility() {
    console.log('🔍 DIAGNOSIS: Checking button visibility...');
    
    // Check all action rows
    const actionRows = document.querySelectorAll('.action-buttons-row');
    console.log(`Total action rows: ${actionRows.length}`);
    
    actionRows.forEach((row, index) => {
        const tabName = row.closest('.tab-content')?.id || 'unknown';
        console.log(`Action row ${index} in tab "${tabName}":`);
        console.log(`  - Hidden class: ${row.classList.contains('hidden')}`);
        console.log(`  - Computed display: ${window.getComputedStyle(row).display}`);
        console.log(`  - Computed visibility: ${window.getComputedStyle(row).visibility}`);
    });
    
    // Check specific buttons
    const buttons = ['moveoutToggleBtn', 'queryToggleBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        console.log(`\nButton "${btnId}":`);
        console.log(`  - Exists: ${!!btn}`);
        if (btn) {
            console.log(`  - Text: "${btn.textContent}"`);
            console.log(`  - Classes: ${btn.className}`);
            console.log(`  - Computed display: ${window.getComputedStyle(btn).display}`);
            console.log(`  - Computed visibility: ${window.getComputedStyle(btn).visibility}`);
            console.log(`  - Parent display: ${window.getComputedStyle(btn.parentElement).display}`);
        }
    });
}

// Expose diagnostic function
window.diagnoseButtonVisibility = diagnoseButtonVisibility;

// Initialize version display when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateVersionDisplay();
    initializeAutoUpdateMenu();
    
    // Immediately ensure property tab is shown and navigation is hidden
    console.log('🔧 DOM loaded, setting initial tab state...');
    const propertyNav = document.getElementById('propertyNavigation');
    if (propertyNav) {
        propertyNav.style.display = 'none';
    }
    
    // Ensure property tab is active and visible
    const propertyTab = document.getElementById('property');
    if (propertyTab) {
        propertyTab.classList.add('active');
        propertyTab.style.display = 'block';
    }
    
    // Initialize forms after DOM is ready
    console.log('🔧 DOM loaded, initializing forms...');
    initializeForms();
    
    // Test button functionality
    setTimeout(() => {
        const moveOutBtn = document.getElementById('moveoutToggleBtn');
        const queryBtn = document.getElementById('queryToggleBtn');
        console.log('🔍 Button elements found:', {
            moveOutBtn: !!moveOutBtn,
            queryBtn: !!queryBtn,
            moveOutBtnText: moveOutBtn?.textContent,
            queryBtnText: queryBtn?.textContent
        });
    }, 2000);
});

// Dismiss update prompt
function dismissUpdate(button) {
    const prompt = button.closest('.update-prompt');
    if (prompt.countdownInterval) {
        clearInterval(prompt.countdownInterval);
    }
    prompt.classList.remove('show');
    setTimeout(() => {
        prompt.remove();
    }, 500); // Longer delay to match CSS transition
}

// Apply update
function applyUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            // Tell the new service worker to skip waiting
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
    }
}

// ===== LEGAL FUNCTIONS =====
function showTermsOfService() {
    document.getElementById('termsOverlay').style.display = 'flex';
}

function showPrivacyPolicy() {
    document.getElementById('privacyOverlay').style.display = 'flex';
}

function showDataInfo() {
    document.getElementById('dataInfoOverlay').style.display = 'flex';
}

function showDeleteAccount() {
    document.getElementById('deleteAccountOverlay').style.display = 'flex';
}

function closeLegalOverlay(overlayId) {
    document.getElementById(overlayId).style.display = 'none';
}

function confirmDeleteAccount() {
    if (confirm('Are you absolutely sure? This will permanently delete ALL your data and cannot be undone.')) {
        // Delete all user data from Firebase
        const user = auth.currentUser;
        if (user) {
            // Delete user data from Firebase
            firebase.database().ref('users/' + user.uid).remove()
                .then(() => {
                    // Delete user account
                    user.delete()
                        .then(() => {
                            // Clear local storage
                            localStorage.clear();
                            // Redirect to login or show success message
                            alert('Your account and all data have been permanently deleted.');
                            window.location.reload();
                        })
                        .catch((error) => {
                            console.error('Error deleting account:', error);
                            alert('Error deleting account. Please contact support.');
                        });
                })
                .catch((error) => {
                    console.error('Error deleting user data:', error);
                    alert('Error deleting data. Please contact support.');
                });
        }
    }
}

// Expose legal functions to global scope
window.showTermsOfService = showTermsOfService;
window.showPrivacyPolicy = showPrivacyPolicy;
window.showDataInfo = showDataInfo;
window.showDeleteAccount = showDeleteAccount;
window.closeLegalOverlay = closeLegalOverlay;
window.confirmDeleteAccount = confirmDeleteAccount;

// ===== COLOR GRADIENT FUNCTIONS =====
function getPropertyGradient(propertyId) {
    // Array of dark colorful gradients - no pure black, rich colors maintained
    const gradients = [
        'linear-gradient(135deg, #2d1b69 0%, #4a148c 100%)', // Deep Purple
        'linear-gradient(135deg, #1a237e 0%, #283593 100%)', // Indigo Blue
        'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)', // Royal Blue
        'linear-gradient(135deg, #004d40 0%, #00695c 100%)', // Deep Teal
        'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)', // Forest Green
        'linear-gradient(135deg, #e65100 0%, #ef6c00 100%)', // Deep Orange
        'linear-gradient(135deg, #bf360c 0%, #d84315 100%)', // Deep Red
        'linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%)', // Purple Violet
        'linear-gradient(135deg, #311b92 0%, #512da8 100%)', // Deep Violet
        'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', // Midnight Blue
        'linear-gradient(135deg, #006064 0%, #00838f 100%)', // Dark Cyan
        'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)', // Dark Green
        'linear-gradient(135deg, #f57c00 0%, #fb8c00 100%)', // Dark Amber
        'linear-gradient(135deg, #c62828 0%, #d32f2f 100%)', // Dark Red
        'linear-gradient(135deg, #ad1457 0%, #c2185b 100%)', // Dark Pink
        'linear-gradient(135deg, #4527a0 0%, #5e35b1 100%)', // Deep Purple
        'linear-gradient(135deg, #01579b 0%, #0277bd 100%)', // Ocean Blue
        'linear-gradient(135deg, #004d40 0%, #00796b 100%)', // Sea Green
        'linear-gradient(135deg, #e64a19 0%, #ff5722 100%)', // Deep Coral
        'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 100%)'  // Purple Magenta
    ];
    
    // Use property ID to consistently assign the same gradient to each property
    const index = Math.abs(propertyId) % gradients.length;
    return gradients[index];
}

function updatePropertyHeaderColors(property) {
    const headers = [
        { id: 'tenantsPropertyHeader', cardId: 'tenantsPropertyHeader' },
        { id: 'rentPropertyHeader', cardId: 'rentPropertyHeader' },
        { id: 'expensesPropertyHeader', cardId: 'expensesPropertyHeader' },
        { id: 'summaryPropertyHeader', cardId: 'summaryPropertyHeader' }
    ];
    
    const gradient = getPropertyGradient(property.id);
    
    headers.forEach(header => {
        const headerElement = document.getElementById(header.id);
        if (headerElement) {
            const card = headerElement.querySelector('.form-card');
            if (card) {
                card.style.background = gradient;
                card.style.color = 'white';
                card.style.padding = '20px';
            }
        }
    });
}

// ===== PROPERTY MANAGEMENT FUNCTIONS =====
function showAddPropertyForm() {
    document.getElementById('addPropertyForm').classList.remove('hidden');
    document.getElementById('propertyName').focus();
}

function hideAddPropertyForm() {
    document.getElementById('addPropertyForm').classList.add('hidden');
    document.getElementById('propertyForm').reset();
}

function selectProperty(propertyId) {
    console.log(' selectProperty called with propertyId:', propertyId, 'type:', typeof propertyId);
    
    // Convert to number to ensure consistent type comparison
    const numericPropertyId = typeof propertyId === 'string' ? parseInt(propertyId) : propertyId;
    
    const property = data.properties.find(p => p.id === numericPropertyId);
    if (property) {
        data.selectedPropertyId = numericPropertyId;
        saveData();
        
        // Hide property cards and show property navigation
        const propertyCards = document.querySelectorAll('.property-card');
        propertyCards.forEach(card => card.style.display = 'none');
        
        const propertyHeaderCard = document.getElementById('propertyHeaderCard');
        if (propertyHeaderCard) propertyHeaderCard.style.display = 'none';
        
        const propertiesList = document.getElementById('propertiesList');
        if (propertiesList) propertiesList.style.display = 'none';
        
        // Show property navigation
        const propNav = document.getElementById('propertyNavigation');
        if (propNav) propNav.style.display = 'flex';
        
        // Show the tenants tab and its content
        showTab('tenants');
        updateTenantSelects();
        updateSummary();
        renderAllEntries();
        
        // Update property headers with property info
        updatePropertyHeaders(property);
    }
}

// Update property headers with property information
function updatePropertyHeaders(property) {
    // Update tenants tab header
    const tenantsPropertyHeader = document.getElementById('tenantsPropertyHeader');
    if (tenantsPropertyHeader) {
        tenantsPropertyHeader.style.display = 'block';
        const tenantsPropertyName = document.getElementById('tenantsPropertyName');
        const tenantsPropertyAddress = document.getElementById('tenantsPropertyAddress');
        if (tenantsPropertyName) tenantsPropertyName.textContent = property.name || 'Property';
        if (tenantsPropertyAddress) tenantsPropertyAddress.textContent = property.address || '';
    }
    
    // Update rent tab header
    const rentPropertyHeader = document.getElementById('rentPropertyHeader');
    if (rentPropertyHeader) {
        rentPropertyHeader.style.display = 'block';
        const rentPropertyName = document.getElementById('rentPropertyName');
        const rentPropertyAddress = document.getElementById('rentPropertyAddress');
        if (rentPropertyName) rentPropertyName.textContent = property.name || 'Property';
        if (rentPropertyAddress) rentPropertyAddress.textContent = property.address || '';
    }
    
    // Update expenses tab header
    const expensesPropertyHeader = document.getElementById('expensesPropertyHeader');
    if (expensesPropertyHeader) {
        expensesPropertyHeader.style.display = 'block';
        const expensesPropertyName = document.getElementById('expensesPropertyName');
        const expensesPropertyAddress = document.getElementById('expensesPropertyAddress');
        if (expensesPropertyName) expensesPropertyName.textContent = property.name || 'Property';
        if (expensesPropertyAddress) expensesPropertyAddress.textContent = property.address || '';
    }
    
    // Update summary tab header
    const summaryPropertyHeader = document.getElementById('summaryPropertyHeader');
    if (summaryPropertyHeader) {
        summaryPropertyHeader.style.display = 'block';
        const summaryPropertyName = document.getElementById('summaryPropertyName');
        const summaryPropertyAddress = document.getElementById('summaryPropertyAddress');
        if (summaryPropertyName) summaryPropertyName.textContent = property.name || 'Property';
        if (summaryPropertyAddress) summaryPropertyAddress.textContent = property.address || '';
    }
    
    // Show back buttons
    const backButtons = ['tenantsBackButton', 'rentBackButton', 'expensesBackButton', 'summaryBackButton'];
    backButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = 'block';
    });
    
    // Show action buttons
    const tenantToggleBtn = document.getElementById('tenantToggleBtn');
    if (tenantToggleBtn) {
        tenantToggleBtn.textContent = 'Add New Tenant';
        tenantToggleBtn.style.display = 'inline-flex';
    }
    
    const monthlyToggleBtn = document.getElementById('monthlyToggleBtn');
    if (monthlyToggleBtn) {
        monthlyToggleBtn.textContent = 'Record Payment';
        monthlyToggleBtn.style.display = 'inline-flex';
    }
    
    const expenseToggleBtn = document.getElementById('expenseToggleBtn');
    if (expenseToggleBtn) {
        expenseToggleBtn.textContent = 'Add Expense';
        expenseToggleBtn.style.display = 'inline-flex';
    }
}

// ===== PROPERTY EXPORT FUNCTIONS =====
function showPropertyExportDialog() {
    try {
        const dialog = document.getElementById('propertyExportDialog');
        if (!dialog) {
            console.error('Export dialog element not found');
            showNotification('Export dialog not available', 'error');
            return;
        }

        const propertySelect = document.getElementById('exportPropertySelect');
        const tenantSelect = document.getElementById('exportTenantSelect');
        const exportTabs = document.getElementById('exportTabs');

        if (!propertySelect || !tenantSelect) {
            console.error('Export select elements missing');
            showNotification('Export UI incomplete', 'error');
            return;
        }

        // Clear previous options
        propertySelect.innerHTML = '<option value="">Choose a property...</option>';
        tenantSelect.innerHTML = '<option value="">Choose a tenant...</option>';
        if (exportTabs) exportTabs.style.display = 'none';

        // Guard against missing data
        if (!data || !data.properties || data.properties.length === 0) {
            propertySelect.innerHTML = '<option value="">No properties available</option>';
            dialog.style.display = 'flex';
            showNotification('No properties to export', 'info');
            return;
        }

        // Populate property select
        data.properties.forEach(property => {
            const option = document.createElement('option');
            option.value = property.id;
            option.textContent = property.name;
            propertySelect.appendChild(option);
        });

        // Pre-select current property if one is selected
        if (data.selectedPropertyId) {
            propertySelect.value = data.selectedPropertyId;
            if (typeof handlePropertySelection === 'function') {
                handlePropertySelection();
            }
        }

        dialog.style.display = 'flex';
        closeUserMenu(); // close the side panel
    } catch (err) {
        console.error('showPropertyExportDialog error:', err);
        showNotification('Failed to open export dialog', 'error');
    }
}

// Handle property selection and show tabs
function handlePropertySelection() {
    const propertyId = document.getElementById('exportPropertySelect').value;
    const exportTabs = document.getElementById('exportTabs');
    const tenantSelect = document.getElementById('exportTenantSelect');
    
    if (propertyId) {
        // Show tabs
        exportTabs.style.display = 'block';
        
        // Populate tenant select for tenant tab
        populateTenantSelect(propertyId);
        
        // Reset to tenant tab
        switchExportTab('tenant');
    } else {
        // Hide tabs if no property selected
        exportTabs.style.display = 'none';
    }
}

// Switch between export tabs
function switchExportTab(tabName) {
    const tenantTab = document.getElementById('tenantExportTab');
    const fullTab = document.getElementById('fullExportTab');
    const tenantBtn = document.getElementById('tenantTabBtn');
    const fullBtn = document.getElementById('fullTabBtn');
    
    // Remove active class from all tabs and buttons
    tenantTab.classList.remove('active');
    fullTab.classList.remove('active');
    tenantBtn.classList.remove('active');
    fullBtn.classList.remove('active');
    
    // Add active class to selected tab and button
    if (tabName === 'tenant') {
        tenantTab.classList.add('active');
        tenantBtn.classList.add('active');
    } else if (tabName === 'full') {
        fullTab.classList.add('active');
        fullBtn.classList.add('active');
    }
}

// Populate tenant select based on selected property
function populateTenantSelect(propertyId) {
    const tenantSelect = document.getElementById('exportTenantSelect');
    tenantSelect.innerHTML = '<option value="">Choose a tenant...</option>';
    
    if (!propertyId) return;
    
    const property = data.properties.find(p => p.id == propertyId);
    if (property && property.tenants) {
        property.tenants.forEach(tenant => {
            const option = document.createElement('option');
            option.value = tenant.id;
            option.textContent = `${tenant.name} - Unit ${tenant.unit}`;
            tenantSelect.appendChild(option);
        });
    }
}

function closePropertyExportDialog() {
    const dialog = document.getElementById('propertyExportDialog');
    dialog.style.display = 'none';
}

function exportTenantStatement() {
    const propertyId = document.getElementById('exportPropertySelect').value;
    const tenantId = document.getElementById('exportTenantSelect').value;
    
    if (!propertyId) {
        showNotification('Please select a property first', 'error');
        return;
    }
    
    if (!tenantId) {
        showNotification('Please select a tenant first', 'error');
        return;
    }
    
    const property = data.properties.find(p => p.id == propertyId);
    const tenant = property.tenants.find(t => t.id == tenantId);
    
    if (!property || !tenant) return;
    
    // Create Excel workbook for tenant data (single sheet)
    if (typeof XLSX !== 'undefined') {
        const workbook = {
            SheetNames: ['Tenant Accounts'],
            Sheets: {}
        };
        
        // Tenant data for selected tenant only
        const tenantData = [
            ['Property Name', 'Unit', 'Tenant Name', 'Phone', 'Email', 'Rent Amount', 'Tenant Since', 'Tenant End', 'Total Paid', 'Deposit Paid', 'Balance', 'Status']
        ];
        
        const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
        const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Calculate correct balance based on actual rental periods
        let expectedRent = 0;
        if (tenant.tenantSince) {
            const startDate = new Date(tenant.tenantSince);
            const endDate = tenant.tenantEnd ? new Date(tenant.tenantEnd) : new Date();
            
            // Calculate months between dates
            const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (endDate.getMonth() - startDate.getMonth());
            
            const monthsCount = Math.max(0, monthsDiff);
            const serviceChargeTotal = monthsCount * 300;
            expectedRent = (tenant.rent * monthsCount) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
        }
        
        const balance = totalPaid - expectedRent;
        const status = balance < 0 ? 'Payment Required' : 'Balanced';
        
        // Helper function to extract payment reference from notes
        function extractPaymentReference(notes) {
            if (!notes) return '';
            // Match CAP text at the beginning of notes (e.g., "CAP12345")
            const match = notes.match(/^CAP\d+/);
            return match ? match[0] : '';
        }
        
        // Get all payment references for this tenant
        const paymentReferences = monthlyPayments
            .map(payment => extractPaymentReference(payment.notes))
            .filter(ref => ref !== '')
            .join(', ');
        
        tenantData.push([
            property.name,
            tenant.unit,
            tenant.name,
            tenant.phone || '',
            tenant.email || '',
            Number(tenant.rent || 0).toFixed(2),
            tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : '',
            tenant.tenantEnd ? new Date(tenant.tenantEnd).toLocaleDateString('en-GB') : '',
            Number(totalPaid || 0).toFixed(2),
            Number(tenant.depositPaid || 0).toFixed(2),
            Number(balance || 0).toFixed(2),
            status
        ]);
        
        // Add payment details rows
        tenantData.push(['', '', '', '', '', '', '', '', '', '', '']);
        tenantData.push(['PAYMENT DETAILS', '', '', '', '', '', '', '', '', '', '']);
        tenantData.push(['Date', 'Amount', 'Reference', 'Notes', '', '', '', '', '', '', '']);
        
        // Sort payments by date (most recent first)
        const sortedPayments = monthlyPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedPayments.forEach(payment => {
            const reference = extractPaymentReference(payment.notes);
            tenantData.push([
                new Date(payment.date).toLocaleDateString(),
                Number(payment.amount) || 0,
                reference,
                payment.notes || '',
                '', '', '', '', '', '', ''
            ]);
        });
        
        const tenantWS = worksheetFromArrayOfArrays(tenantData);
        workbook.Sheets['Tenant Accounts'] = tenantWS;
        
        // Generate Excel file
        const wbout = XLSX.write(workbook, {bookType: 'xlsx', type: 'binary'});
        const blob = new Blob([s2ab(wbout)], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tenant.name}-statement-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        
        closePropertyExportDialog();
        showNotification('Excel statement (.xlsx) exported successfully for ' + tenant.name + '!');
    } else {
        // Fallback to CSV if XLSX not available
        let csv = 'Property Name,Unit,Tenant Name,Phone,Email,Rent Amount,Tenant Since,Tenant End,Total Paid,Deposit Paid,Balance,Status\n';
        
        const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
        const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Calculate correct balance based on actual rental periods
        let expectedRent = 0;
        if (tenant.tenantSince) {
            const startDate = new Date(tenant.tenantSince);
            const endDate = tenant.tenantEnd ? new Date(tenant.tenantEnd) : new Date();
            
            // Calculate months between dates
            const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (endDate.getMonth() - startDate.getMonth());
            
            const monthsCount = Math.max(0, monthsDiff);
            const serviceChargeTotal = monthsCount * 300;
            expectedRent = (tenant.rent * monthsCount) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
        }
        
        const balance = totalPaid - expectedRent;
        const status = balance < 0 ? 'Payment Required' : 'Balanced';
        
        // Helper function to extract payment reference from notes
        function extractPaymentReference(notes) {
            if (!notes) return '';
            // Match CAP text at the beginning of notes (e.g., "CAP12345")
            const match = notes.match(/^CAP\d+/);
            return match ? match[0] : '';
        }
        
        csv += `"${property.name}","${tenant.unit}","${tenant.name}","${tenant.phone || ''}","${tenant.email || ''}","${Number(tenant.rent || 0).toFixed(2)}","${tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : ''}","${tenant.tenantEnd ? new Date(tenant.tenantEnd).toLocaleDateString('en-GB') : ''}","${Number(totalPaid || 0).toFixed(2)}","${Number(tenant.depositPaid || 0).toFixed(2)}","${Number(balance || 0).toFixed(2)}","${status}"\n`;
        
        // Add payment details
        csv += '\nPAYMENT DETAILS\n';
        csv += 'Date,Amount,Reference,Notes\n';
        
        // Sort payments by date (most recent first)
        const sortedPayments = monthlyPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedPayments.forEach(payment => {
            const reference = extractPaymentReference(payment.notes);
            csv += `"${new Date(payment.date).toLocaleDateString()}",${Number(payment.amount) || 0},"${reference}","${payment.notes || ''}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tenant.name}-statement-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        closePropertyExportDialog();
        showNotification('CSV statement (.csv) exported successfully for ' + tenant.name + '!');
    }
}

function exportTenantStatementImage() {
    const propertyId = document.getElementById('exportPropertySelect').value;
    const tenantId = document.getElementById('exportTenantSelect').value;
    
    if (!propertyId) {
        showNotification('Please select a property first', 'error');
        return;
    }
    
    if (!tenantId) {
        showNotification('Please select a tenant first', 'error');
        return;
    }
    
    const property = data.properties.find(p => p.id == propertyId);
    const tenant = property.tenants.find(t => t.id == tenantId);
    
    if (!property || !tenant) return;
    
    // Calculate tenant financials
    const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
    const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const monthsCount = monthlyPayments.length;
    const serviceChargeTotal = monthsCount * 300;
    const expectedTotal = (tenant.rent * monthsCount) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
    const balance = totalPaid - expectedTotal;
    
    // Create a temporary statement element for screenshot
    const statementDiv = document.createElement('div');
    statementDiv.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 400px;
        padding: 20px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        color: #333;
        z-index: 9999;
    `;
    
    // Build statement content
    let statementHTML = `
        <h2 style="margin: 0 0 15px 0; color: #2563eb; font-size: 18px;">Tenant Statement</h2>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">${property.name}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">${property.address}</p>
        
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">${tenant.name}</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Unit:</strong> ${tenant.unit}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${tenant.phone || 'N/A'}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
        </div>
        
        <div style="margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Financial Summary</h4>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Monthly Rent:</strong> Ksh ${tenant.rent}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Garbage Service:</strong> Ksh 300</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Initial Deposit:</strong> Ksh ${tenant.depositPaid || 0}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Total Paid (Receipts):</strong> Ksh ${totalPaid}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Statement Balance:</strong> Ksh ${balance} (${balance < 0 ? 'Due' : 'Credit'})</p>
        </div>
        
        <div style="margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Recent Payments</h4>
    `;
    
    // Add recent payments (last 5)
    const recentPayments = monthlyPayments.slice(-5).reverse();
    recentPayments.forEach(payment => {
        statementHTML += `
            <p style="margin: 5px 0; font-size: 12px;">
                ${new Date(payment.date).toLocaleDateString()}: Ksh ${payment.amount}
                ${payment.notes ? '<br><span style="color: #666; font-size: 11px;">' + payment.notes.substring(0, 50) + '...</span>' : ''}
            </p>
        `;
    });
    
    statementHTML += `
        </div>
        
        <div style="margin: 20px 0; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center;">
            Generated on ${new Date().toLocaleDateString()}
        </div>
    `;
    
    statementDiv.innerHTML = statementHTML;
    document.body.appendChild(statementDiv);
    
    // Use html2canvas for screenshot if available
    if (typeof html2canvas !== 'undefined') {
        html2canvas(statementDiv, {
            backgroundColor: '#ffffff',
            scale: 2
        }).then(canvas => {
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${tenant.name}-statement-${new Date().toISOString().split('T')[0]}.png`;
                link.click();
                URL.revokeObjectURL(url);
                
                // Clean up
                document.body.removeChild(statementDiv);
                closePropertyExportDialog();
                showNotification('Image statement (.png) exported successfully for ' + tenant.name + '!');
            }, 'image/png');
        }).catch(error => {
            console.error('Screenshot error:', error);
            document.body.removeChild(statementDiv);
            showNotification('Failed to generate screenshot', 'error');
        });
    } else {
        document.body.removeChild(statementDiv);
        showNotification('Screenshot library not available', 'error');
    }
}

function exportPropertyFull() {
    const propertyId = document.getElementById('exportPropertySelect').value;
    if (!propertyId) {
        showNotification('Please select a property first', 'error');
        return;
    }
    
    const property = data.properties.find(p => p.id == propertyId);
    if (!property) return;
    
    // Create Excel workbook with multiple sheets
    if (typeof XLSX !== 'undefined') {
        const workbook = {
            SheetNames: [],
            Sheets: {}
        };
        
        // ===== PROPERTY OVERVIEW SHEET =====
        const propertyData = [
            ['Property Name', property.name],
            ['Address', property.address],
            ['Type', property.type],
            ['Total Units', property.units],
            ['Description', property.description || ''],
            ['', ''],
            ['Summary Metrics', ''],
            ['Total Tenants', property.tenants?.length || 0],
            ['Occupied Units', property.tenants?.filter(t => !t.archived).length || 0],
            ['Vacant Units', property.units - (property.tenants?.filter(t => !t.archived).length || 0)],
        ];
        
        const propertyWS = worksheetFromArrayOfArrays(propertyData);
        workbook.SheetNames.push('Property Overview');
        workbook.Sheets['Property Overview'] = propertyWS;
        
        // ===== TENANT ACCOUNTS SHEET =====
        if (property.tenants && property.tenants.length > 0) {
            const tenantData = [
                ['Unit', 'Tenant Name', 'Phone', 'Email', 'Rent Amount', 'Tenant Since', 'Total Paid', 'Deposit Paid', 'Balance', 'Status']
            ];
            
            property.tenants.forEach(tenant => {
                const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
                const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                const monthsCount = monthlyPayments.length;
    const serviceChargeTotal = monthsCount * 300;
    const expectedTotal = (tenant.rent * monthsCount) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
    const balance = totalPaid - expectedTotal;
                const status = balance < 0 ? 'Payment Required' : 'Balanced';
                
                // Format date properly
                const formattedDate = tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : '';
                
                tenantData.push([
                    tenant.unit,
                    tenant.name,
                    tenant.phone || '',
                    tenant.email || '',
                    Number(tenant.rent || 0).toFixed(2),
                    formattedDate,
                    Number(totalPaid || 0).toFixed(2),
                    Number(tenant.depositPaid || 0).toFixed(2),
                    Number(balance || 0).toFixed(2),
                    status
                ]);
            });
            
            const tenantWS = worksheetFromArrayOfArrays(tenantData);
            workbook.SheetNames.push('Tenant Accounts');
            workbook.Sheets['Tenant Accounts'] = tenantWS;
        }
        
        // ===== RENT PAYMENT HISTORY SHEET =====
        if (property.monthly && property.monthly.length > 0) {
            const paymentData = [
                ['Payment Date', 'Tenant Name', 'Unit', 'Amount', 'Payment Method', 'Payment Type', 'Notes', 'Status']
            ];
            
            property.monthly.forEach(payment => {
                const tenant = property.tenants?.find(t => t.id == payment.tenantId);
                paymentData.push([
                    payment.date,
                    tenant ? tenant.name : 'Unknown',
                    tenant ? tenant.unit : 'N/A',
                    payment.amount,
                    payment.method || 'Cash',
                    'Rent',
                    payment.notes || '',
                    'Paid'
                ]);
            });
            
            const paymentWS = worksheetFromArrayOfArrays(paymentData);
            workbook.SheetNames.push('Rent Payments');
            workbook.Sheets['Rent Payments'] = paymentWS;
        }
        
        // ===== EXPENSES SHEET =====
        if (property.expenses && property.expenses.length > 0) {
            const expenseData = [
                ['Expense Date', 'Category', 'Description', 'Amount', 'Reference', 'Status']
            ];
            
            property.expenses.forEach(expense => {
                expenseData.push([
                    expense.date,
                    expense.category,
                    expense.description,
                    expense.amount,
                    expense.reference || '',
                    'Paid'
                ]);
            });
            
            const expenseWS = worksheetFromArrayOfArrays(expenseData);
            workbook.SheetNames.push('Expenses');
            workbook.Sheets['Expenses'] = expenseWS;
        }
        
        // ===== FINANCIAL SUMMARY SHEET =====
        const totalIncome = property.monthly?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        const totalExpenses = property.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
        const netIncome = totalIncome - totalExpenses;
        const totalTenants = property.tenants?.length || 0;
        const occupiedUnits = property.tenants?.filter(t => !t.archived).length || 0;
        const vacantUnits = property.units - occupiedUnits;
        const avgRent = totalTenants > 0 ? (property.tenants.reduce((sum, t) => sum + t.rent, 0) / totalTenants).toFixed(0) : 0;
        
        const summaryData = [
            ['Financial Metric', 'Amount', 'Details'],
            ['Total Income', totalIncome, 'Sum of all rent payments'],
            ['Total Expenses', totalExpenses, 'Sum of all expenses'],
            ['Net Income', netIncome, 'Income minus expenses'],
            ['Occupancy Rate', occupiedUnits + '/' + property.units + ' (' + ((occupiedUnits/property.units)*100).toFixed(1) + '%)', 'Occupied vs total units'],
            ['Average Rent', avgRent, 'Average rent per tenant'],
            ['Total Tenants', totalTenants, 'Number of tenants'],
            ['Vacant Units', vacantUnits, 'Units without tenants'],
        ];
        
        const summaryWS = worksheetFromArrayOfArrays(summaryData);
        workbook.SheetNames.push('Financial Summary');
        workbook.Sheets['Financial Summary'] = summaryWS;
        
        // Generate Excel file
        const wbout = XLSX.write(workbook, {bookType: 'xlsx', type: 'binary'});
        const blob = new Blob([s2ab(wbout)], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${property.name}-full-accounts-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        
        closePropertyExportDialog();
        showNotification('Excel file (.xlsx) with multiple sheets exported successfully!');
    } else {
        // Fallback to CSV if XLSX not available
        let csv = '';
        
        // Property Information
        csv += 'PROPERTY INFORMATION\n';
        csv += 'Property Name,Address,Type,Units,Description\n';
        csv += `"${property.name}","${property.address}","${property.type}",${property.units},"${property.description || ''}"\n\n`;
        
        // Tenant Accounts
        csv += 'TENANT ACCOUNTS\n';
        csv += 'Property Name,Unit,Tenant Name,Phone,Email,Rent Amount,Tenant Since,Total Paid,Deposit Paid,Balance\n';
        if (property.tenants) {
            property.tenants.forEach(tenant => {
                const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
                const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                
                // Calculate projected balance: (rent * months since tenant started) - total paid
                const monthsSinceStart = tenant.tenantSince ? 
                    Math.max(1, Math.floor((new Date() - new Date(tenant.tenantSince)) / (1000 * 60 * 60 * 24 * 30))) : 1;
                const serviceChargeTotal = monthsSinceStart * 300;
                const expectedTotal = (tenant.rent * monthsSinceStart) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
                const balance = totalPaid - expectedTotal;
                
                // Format date properly
                const formattedDate = tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : '';
                
                csv += `"${property.name}","${tenant.unit}","${tenant.name}","${tenant.phone || ''}","${tenant.email || ''}","${Number(tenant.rent || 0).toFixed(2)}","${formattedDate}","${Number(totalPaid || 0).toFixed(2)}","${Number(tenant.depositPaid || 0).toFixed(2)}","${Number(balance || 0).toFixed(2)}"\n`;
            });
        }
        csv += '\n';
        
        // Payment History
        csv += 'PAYMENT HISTORY\n';
        csv += 'Date,Property Name,Tenant Name,Unit,Amount,Payment Type,Notes\n';
        if (property.monthly) {
            property.monthly.forEach(payment => {
                const tenant = property.tenants?.find(t => t.id == payment.tenantId);
                csv += `"${payment.date}","${property.name}","${tenant ? tenant.name : 'Unknown'}","${tenant ? tenant.unit : 'N/A'}",${payment.amount},"Rent","${payment.notes || ''}"\n`;
            });
        }
        csv += '\n';
        
        // Expenses
        csv += 'EXPENSES\n';
        csv += 'Date,Property Name,Category,Description,Amount,Reference\n';
        if (property.expenses) {
            property.expenses.forEach(expense => {
                csv += `"${expense.date}","${property.name}","${expense.category}","${expense.description}",${expense.amount},"${expense.reference || ''}"\n`;
            });
        }
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${property.name}-full-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        closePropertyExportDialog();
        showNotification('Full property CSV exported successfully!');
    }
}

function exportPropertyScreenshot() {
    const propertyId = document.getElementById('exportPropertySelect').value;
    if (!propertyId) {
        showNotification('Please select a property first', 'error');
        return;
    }
    
    const property = data.properties.find(p => p.id == propertyId);
    if (!property) return;
    
    // Create a temporary summary element for screenshot
    const summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 400px;
        padding: 20px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        color: #333;
        z-index: 9999;
    `;
    
    // Build summary content
    let summaryHTML = `
        <h2 style="margin: 0 0 15px 0; color: #2563eb; font-size: 18px;">${property.name}</h2>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">${property.address}</p>
        <div style="margin: 15px 0; padding: 10px; background: #f8fafc; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b;">Property Summary</h3>
            <p style="margin: 3px 0; font-size: 11px;">Type: ${property.type} | Units: ${property.units}</p>
    `;
    
    // Add tenant summary
    if (property.tenants && property.tenants.length > 0) {
        summaryHTML += `
            <h3 style="margin: 15px 0 10px 0; font-size: 14px; color: #1e293b;">Tenants (${property.tenants.length})</h3>
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <tr style="background: #e2e8f0;">
                    <th style="padding: 5px; text-align: left; border: 1px solid #cbd5e1;">Unit</th>
                    <th style="padding: 5px; text-align: left; border: 1px solid #cbd5e1;">Name</th>
                    <th style="padding: 5px; text-align: right; border: 1px solid #cbd5e1;">Rent</th>
                </tr>
        `;
        
        property.tenants.forEach(tenant => {
            summaryHTML += `
                <tr>
                    <td style="padding: 3px 5px; border: 1px solid #e2e8f0;">${tenant.unit}</td>
                    <td style="padding: 3px 5px; border: 1px solid #e2e8f0;">${tenant.name}</td>
                    <td style="padding: 3px 5px; text-align: right; border: 1px solid #e2e8f0;">Ksh ${tenant.rent.toLocaleString()}</td>
                </tr>
            `;
        });
        
        summaryHTML += '</table>';
    }
    
    // Add financial summary
    const totalIncome = property.monthly?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const totalExpenses = property.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const netIncome = totalIncome - totalExpenses;
    
    summaryHTML += `
        <h3 style="margin: 15px 0 10px 0; font-size: 14px; color: #1e293b;">Financial Summary</h3>
        <div style="font-size: 11px;">
            <p style="margin: 3px 0;">Total Income: <strong>Ksh ${totalIncome.toLocaleString()}</strong></p>
            <p style="margin: 3px 0;">Total Expenses: <strong>Ksh ${totalExpenses.toLocaleString()}</strong></p>
            <p style="margin: 3px 0;">Net Income: <strong style="color: ${netIncome >= 0 ? '#16a34a' : '#dc2626'};">Ksh ${netIncome.toLocaleString()}</strong></p>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 10px; color: #94a3b8; text-align: center;">
            Generated on ${new Date().toLocaleDateString()} via Inzu App
        </p>
    `;
    
    summaryDiv.innerHTML = summaryHTML;
    document.body.appendChild(summaryDiv);
    
    // Use html2canvas to capture the summary
    if (typeof html2canvas !== 'undefined') {
        html2canvas(summaryDiv, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
        }).then(canvas => {
            // Convert canvas to blob and download
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${property.name}-summary-${new Date().toISOString().split('T')[0]}.png`;
                link.click();
                URL.revokeObjectURL(url);
                
                // Clean up
                document.body.removeChild(summaryDiv);
                closePropertyExportDialog();
                showNotification('PNG image (.png) exported successfully - ready for WhatsApp sharing!');
            }, 'image/png');
        }).catch(error => {
            console.error('Screenshot error:', error);
            document.body.removeChild(summaryDiv);
            showNotification('Failed to generate screenshot', 'error');
        });
    } else {
        document.body.removeChild(summaryDiv);
        showNotification('Screenshot library not available', 'error');
    }
}

function savePropertyInfo() {
    const propertyName = document.getElementById('propertyName').value.trim();
    const propertyAddress = document.getElementById('propertyAddress').value.trim();
    const propertyType = document.getElementById('propertyType').value;
    const propertyUnits = document.getElementById('propertyUnits').value;
    const propertyDescription = document.getElementById('propertyDescription').value.trim();

    if (!propertyName || !propertyAddress || !propertyType || !propertyUnits) {
        showNotification('Please fill in all required property fields');
        return;
    }

    const property = {
        id: Date.now(),
        name: propertyName,
        address: propertyAddress,
        type: propertyType,
        units: parseInt(propertyUnits),
        description: propertyDescription,
        tenants: [],        // 🔑 REQUIRED: Always initialize
        monthly: [],         // 🔑 REQUIRED: Always initialize
        expenses: [],        // 🔑 REQUIRED: Always initialize
        moveOuts: [],         // 🔑 REQUIRED: Always initialize
        queries: [],          // 🔑 REQUIRED: Always initialize
        createdAt: new Date().toISOString()
    };

    data.properties.push(property);
    saveData();
    renderProperties();
    hideAddPropertyForm();
    showToast('Property added successfully', 'success');
}


function backToProperties() {
    data.selectedPropertyId = null;
    saveData();
    
    // === TOGGLE VISIBILITY ===
    // Show: Property cards
    const propertyCards = document.querySelectorAll('.property-card');
    propertyCards.forEach(card => card.style.display = 'block');
    
    // Show: Property title bar
    const propertyHeaderCard = document.getElementById('propertyHeaderCard');
    if (propertyHeaderCard) propertyHeaderCard.style.display = 'block';
    
    // Show: Add property button (reset text)
    const addPropertyBtn = document.querySelector('#propertyHeaderCard .btn-primary');
    if (addPropertyBtn) addPropertyBtn.style.display = 'inline-flex';
    
    // Show: Properties list container
    const propertiesList = document.getElementById('propertiesList');
    if (propertiesList) propertiesList.style.display = 'block';
    
    // Hide: Property navigation tabs
    const propNav = document.getElementById('propertyNavigation');
    if (propNav) {
        propNav.style.display = 'none';
    }
    
    // Hide: Tenants tab
    const tenantsTab = document.getElementById('tenants');
    if (tenantsTab) {
        tenantsTab.classList.remove('active');
        tenantsTab.style.display = 'none';
    }
    
    // Hide: Property header in tenants tab
    const tenantsPropertyHeader = document.getElementById('tenantsPropertyHeader');
    if (tenantsPropertyHeader) tenantsPropertyHeader.style.display = 'none';
    
    // Hide: Property header in rent tab
    const rentPropertyHeader = document.getElementById('rentPropertyHeader');
    if (rentPropertyHeader) rentPropertyHeader.style.display = 'none';
    
    // Hide: Property header in expenses tab
    const expensesPropertyHeader = document.getElementById('expensesPropertyHeader');
    if (expensesPropertyHeader) expensesPropertyHeader.style.display = 'none';
    
    // Hide: Property header in summary tab
    const summaryPropertyHeader = document.getElementById('summaryPropertyHeader');
    if (summaryPropertyHeader) summaryPropertyHeader.style.display = 'none';
    
    // Hide: Back button
    const tenantsBackButton = document.getElementById('tenantsBackButton');
    if (tenantsBackButton) tenantsBackButton.style.display = 'none';
    
    const rentBackButton = document.getElementById('rentBackButton');
    if (rentBackButton) rentBackButton.style.display = 'none';
    
    const expensesBackButton = document.getElementById('expensesBackButton');
    if (expensesBackButton) expensesBackButton.style.display = 'none';
    
    const summaryBackButton = document.getElementById('summaryBackButton');
    if (summaryBackButton) summaryBackButton.style.display = 'none';
    
    // Reset: Add New Tenant button text
    const tenantToggleBtn = document.getElementById('tenantToggleBtn');
    if (tenantToggleBtn) {
        tenantToggleBtn.textContent = '➕ Add New Tenant';
        tenantToggleBtn.style.display = 'none';
    }
    
    // Hide: Monthly toggle button
    const monthlyToggleBtn = document.getElementById('monthlyToggleBtn');
    if (monthlyToggleBtn) {
        monthlyToggleBtn.style.display = 'none';
    }
    
    // Hide: Expense toggle button
    const expenseToggleBtn = document.getElementById('expenseToggleBtn');
    if (expenseToggleBtn) {
        expenseToggleBtn.style.display = 'none';
    }
    
    // Collapse: Add tenant form
    const tenantFormCollapsible = document.getElementById('tenantFormCollapsible');
    if (tenantFormCollapsible) {
        tenantFormCollapsible.style.maxHeight = '0';
        tenantFormCollapsible.style.opacity = '0';
        tenantFormCollapsible.classList.add('collapsed');
    }
    
    // Hide: Tenants list
    const tenantsList = document.getElementById('tenantsList');
    if (tenantsList) tenantsList.style.display = 'none';
    
    // Hide all property management tabs
    const propertyTabs = ['tenants', 'monthly', 'expenses', 'summary'];
    propertyTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.classList.remove('active');
            tab.style.display = 'none';
        }
    });
    
    // Hide action buttons in all tabs
    const actionRows = document.querySelectorAll('.action-buttons-row');
    actionRows.forEach(row => {
        if (row) row.style.display = 'none';
    });
    
    // Show: Properties tab content
    const propertiesTab = document.getElementById('property');
    if (propertiesTab) {
        propertiesTab.classList.add('active');
        propertiesTab.style.display = 'block';
    }
    
    // Re-render properties list
    renderProperties();
}

function renderProperties() {
    console.log('🔍 renderProperties called');
    const container = document.getElementById('propertiesList');
    console.log('🔍 propertiesList container:', container);
    
    if (!container) {
        console.log('❌ propertiesList container not found!');
        return;
    }
    
    console.log('🔍 Total properties:', data.properties?.length || 0);
    
    if (!data.properties || data.properties.length === 0) {
        console.log('🔍 Showing empty state for properties');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-text">No properties yet</div>
                <div class="empty-state-subtext">Add your first property to get started</div>
            </div>
        `;
        return;
    }
    
    console.log('🔍 Rendering properties list');
    // Convert selectedPropertyId to number for consistent comparison
    const currentSelectedId = data.selectedPropertyId ? parseInt(data.selectedPropertyId, 10) : null;
    container.innerHTML = data.properties.map(property => {
        // Calculate occupancy
        const totalUnits = property.units || 1;
        const occupiedUnits = property.tenants?.filter(t => !t.archived).length || 0;
        const vacantUnits = totalUnits - occupiedUnits;
        const occupancyText = `${occupiedUnits}/${totalUnits} Occupied - ${vacantUnits} Vacant`;
        
        console.log(`🏠 ${property.name} - Occupancy: ${occupancyText} (Total: ${totalUnits}, Active: ${occupiedUnits}, Archived: ${property.tenants?.filter(t => t.archived).length || 0})`);
        
        return `
        <div class="property-card ${currentSelectedId === property.id ? 'selected' : ''}" onclick="selectProperty('${property.id}')">
            <div class="property-info">
                <div class="property-name">${property.name}</div>
                <div class="property-details">
                    ${property.address || 'No address'} • ${occupancyText}
                </div>
                <div class="property-description">${property.description || 'No description available'}</div>
            </div>
            <div class="property-actions">
                <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); editProperty('${property.id}')">Edit</button>
            </div>
        </div>
    `;
    }).join('');
    
    console.log('✅ renderProperties completed');
}

function deleteProperty(propertyId) {
    const idToDelete = propertyId ? parseInt(propertyId) : editingPropertyId;
    if (!idToDelete) {
        console.error('🔧 No property ID to delete');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this property? All associated tenant data will also be deleted.')) return;
    
    console.log('🔧 Deleting property with ID:', idToDelete);
    
    data.properties = data.properties.filter(p => p.id !== idToDelete);
    
    if (data.selectedPropertyId === idToDelete) {
        data.selectedPropertyId = null;
    }
    
    saveData();
    renderProperties();
    renderAllEntries();
    updateTenantSelects();
    cancelPropertyEdit();
    showToast('Property deleted successfully', 'success');
}

function getSelectedProperty() {
    if (!data.selectedPropertyId) return null;
    return data.properties.find(p => p.id === data.selectedPropertyId);
}

// Property editing functions
function editProperty(propertyId) {
    console.log('🔧 editProperty called with propertyId:', propertyId, 'type:', typeof propertyId);
    // Convert to number for comparison (property IDs are stored as numbers)
    const numericId = parseInt(propertyId, 10);
    console.log('🔧 Numeric ID:', numericId, 'type:', typeof numericId);
    
    const property = data.properties.find(p => p.id === numericId);
    console.log('🔧 Found property:', property);
    
    if (!property) {
        console.error('🔧 Property not found with ID:', numericId);
        showNotification('Property not found');
        return;
    }

    // Store as number for consistency
    editingPropertyId = numericId;
    
    // Populate edit form with property data
    document.getElementById('editPropertyName').value = property.name || '';
    document.getElementById('editPropertyAddress').value = property.address || '';
    document.getElementById('editPropertyType').value = property.type || '';
    document.getElementById('editPropertyUnits').value = property.units || 1;
    document.getElementById('editPropertyDescription').value = property.description || '';
    
    // Store initial state for change detection
    propertyFormInitialState = JSON.stringify({
        name: property.name || '',
        address: property.address || '',
        type: property.type || '',
        units: property.units || 1,
        description: property.description || ''
    });
    hasPropertyFormChanged = false;
    updatePropertyEditButtonState();
    
    // Show edit overlay
    const overlay = document.getElementById('propertyEditOverlay');
    console.log('🔧 Edit overlay element:', overlay);
    if (overlay) {
        overlay.classList.remove('hidden');
        console.log('🔧 Overlay hidden class removed');
    } else {
        console.error('🔧 Edit overlay element not found!');
    }
    document.body.style.overflow = 'hidden';
    
    // Focus on first field
    const firstField = document.getElementById('editPropertyName');
    if (firstField) {
        firstField.focus();
        console.log('🔧 Focused on first field');
    }
}

// Check if property form values have changed
function checkPropertyFormChanges() {
    const currentState = JSON.stringify({
        name: document.getElementById('editPropertyName').value.trim(),
        address: document.getElementById('editPropertyAddress').value.trim(),
        type: document.getElementById('editPropertyType').value,
        units: parseInt(document.getElementById('editPropertyUnits').value) || 1,
        description: document.getElementById('editPropertyDescription').value.trim()
    });
    hasPropertyFormChanged = currentState !== propertyFormInitialState;
    console.log('🔧 Property form change detected:', hasPropertyFormChanged);
    console.log('🔧 Current state:', currentState);
    console.log('🔧 Initial state:', propertyFormInitialState);
    updatePropertyEditButtonState();
}

// Enable/disable the update button based on changes
function updatePropertyEditButtonState() {
    const updateBtn = document.querySelector('#propertyEditForm button[type="submit"]');
    console.log('🔧 Updating property edit button state, hasPropertyFormChanged:', hasPropertyFormChanged);
    console.log('🔧 Update button found:', !!updateBtn);
    if (updateBtn) {
        updateBtn.disabled = !hasPropertyFormChanged;
        updateBtn.style.opacity = hasPropertyFormChanged ? '1' : '0.5';
        updateBtn.style.cursor = hasPropertyFormChanged ? 'pointer' : 'not-allowed';
        console.log('🔧 Button state updated - disabled:', updateBtn.disabled);
    } else {
        console.error('🔧 Property edit button not found!');
    }
}

function cancelPropertyEdit() {
    editingPropertyId = null;
    document.getElementById('propertyEditOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('propertyEditForm').reset();
}

function updateProperty() {
    console.log('🔧 updateProperty() called, editingPropertyId:', editingPropertyId, 'type:', typeof editingPropertyId);
    if (!editingPropertyId) {
        console.error('🔧 No editingPropertyId, exiting');
        return;
    }

    const propertyName = document.getElementById('editPropertyName').value.trim();
    const propertyAddress = document.getElementById('editPropertyAddress').value.trim();
    const propertyType = document.getElementById('editPropertyType').value;
    const propertyUnits = document.getElementById('editPropertyUnits').value;
    const propertyDescription = document.getElementById('editPropertyDescription').value.trim();

    console.log('🔧 Form values:', { propertyName, propertyAddress, propertyType, propertyUnits, propertyDescription });

    if (!propertyName || !propertyAddress || !propertyType || !propertyUnits) {
        console.error('🔧 Validation failed - missing required fields');
        showNotification('Please fill in all required property fields');
        return;
    }

    // Fix type mismatch - ensure we're comparing numbers
    const numericEditingId = parseInt(editingPropertyId, 10);
    console.log('🔧 Looking for property with numeric ID:', numericEditingId);
    
    const propertyIndex = data.properties.findIndex(p => p.id === numericEditingId);
    console.log('🔧 Property index found:', propertyIndex);
    console.log('🔧 Available property IDs:', data.properties.map(p => ({ id: p.id, type: typeof p.id })));
    
    if (propertyIndex === -1) {
        console.error('🔧 Property not found with ID:', numericEditingId);
        showNotification('Property not found');
        return;
    }

    // Update property data
    data.properties[propertyIndex] = {
        ...data.properties[propertyIndex],
        name: propertyName,
        address: propertyAddress,
        type: propertyType,
        units: parseInt(propertyUnits),
        description: propertyDescription,
        updatedAt: new Date().toISOString()
    };

    console.log('🔧 Property updated, saving data...');
    saveData();
    renderProperties();
    cancelPropertyEdit();
    showToast('Property updated successfully', 'success');
}

// ===== TAB MANAGEMENT =====
function showTab(tabName, buttonElement) {
    console.log('🔍 showTab called with tabName:', tabName);
    console.log('🔍 buttonElement:', buttonElement);
    
    // Hide all tabs by removing active class
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        if (tab) {
            tab.classList.remove('active');
            tab.classList.remove('sliding-in');
            tab.style.display = 'none';
        }
    });
    
    // Remove active class from all buttons in both navigations
    const allButtons = document.querySelectorAll('.tab-button');
    allButtons.forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
        }
    });
    
    // Add active class to clicked button (if provided)
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    // Show the selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }
    
    // Update specific tab content
    if (tabName === 'property') {
        console.log('🔍 Activating PROPERTY tab');
        console.log('🔍 Property cards found:', document.querySelectorAll('.property-card').length);
        console.log('🔍 Property header card found:', !!document.getElementById('propertyHeaderCard'));
        console.log('🔍 Property navigation found:', !!document.getElementById('propertyNavigation'));
        
        // === TOGGLE VISIBILITY FOR PROPERTIES TAB ===
        // Show: Property cards
        const propertyCards = document.querySelectorAll('.property-card');
        console.log('🔍 Setting property cards display to block');
        propertyCards.forEach(card => {
            card.style.display = 'block';
            console.log('🔍 Property card display set to:', card.style.display);
        });
        
        // Show: Property title bar
        const propertyHeaderCard = document.getElementById('propertyHeaderCard');
        if (propertyHeaderCard) {
            console.log('🔍 Setting property header card display to block');
            propertyHeaderCard.style.display = 'block';
        } else {
            console.log('❌ Property header card NOT found');
        }
        
        // Show: Add property button
        const addPropertyBtn = document.querySelector('#propertyHeaderCard .btn-primary');
        if (addPropertyBtn) {
            console.log('🔍 Setting add property button display to inline-flex');
            addPropertyBtn.style.display = 'inline-flex';
        } else {
            console.log('❌ Add property button NOT found');
        }
        
        // Hide: Property navigation tabs
        const propNav = document.getElementById('propertyNavigation');
        if (propNav) {
            console.log('🔍 Hiding property navigation');
            propNav.style.display = 'none';
        }
        
        // Hide: All property management tabs
        const propertyTabs = ['tenants', 'monthly', 'expenses', 'summary'];
        propertyTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                console.log(`🔍 Hiding tab: ${tabId}`);
                tab.classList.remove('active');
                tab.style.display = 'none';
            }
        });
        
        // Hide: Property header in tenants tab
        const tenantsPropertyHeader = document.getElementById('tenantsPropertyHeader');
        if (tenantsPropertyHeader) tenantsPropertyHeader.style.display = 'none';
        
        // Hide: Back buttons
        const backButtons = ['tenantsBackButton', 'rentBackButton', 'expensesBackButton', 'summaryBackButton'];
        backButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
        });
        
        // Hide: Add tenant form and button
        const tenantToggleBtn = document.getElementById('tenantToggleBtn');
        if (tenantToggleBtn) tenantToggleBtn.style.display = 'none';
        
        const tenantFormCollapsible = document.getElementById('tenantFormCollapsible');
        if (tenantFormCollapsible) {
            tenantFormCollapsible.style.maxHeight = '0';
            tenantFormCollapsible.style.opacity = '0';
            tenantFormCollapsible.classList.add('collapsed');
        }
        
        // Hide: Tenants list
        const tenantsList = document.getElementById('tenantsList');
        if (tenantsList) tenantsList.style.display = 'none';
        
        renderProperties();
    } else if (tabName === 'tenants') {
        console.log('🔍 Activating TENANTS tab');
        
        // Show: Tenants list
        const tenantsList = document.getElementById('tenantsList');
        if (tenantsList) {
            tenantsList.style.display = 'block';
            console.log('🔍 Showing tenants list');
        }
        
        // Show: Add tenant button
        const tenantToggleBtn = document.getElementById('tenantToggleBtn');
        if (tenantToggleBtn) {
            tenantToggleBtn.style.display = 'inline-flex';
        }
        
        renderTenants();
    } else if (tabName === 'monthly') {
        console.log('🔍 Activating MONTHLY tab');
        
        // Show: Monthly list
        const monthlyList = document.getElementById('monthlyList');
        if (monthlyList) {
            monthlyList.style.display = 'block';
            console.log('🔍 Showing monthly list');
        }
        
        // Show: Add payment button
        const monthlyToggleBtn = document.getElementById('monthlyToggleBtn');
        if (monthlyToggleBtn) {
            monthlyToggleBtn.style.display = 'inline-flex';
        }
        
        renderMonthly();
    } else if (tabName === 'expenses') {
        console.log('🔍 Activating EXPENSES tab');
        
        // Show: Expenses list
        const expensesList = document.getElementById('expensesList');
        if (expensesList) {
            expensesList.style.display = 'block';
            console.log('🔍 Showing expenses list');
        }
        
        // Show: Add expense button
        const expenseToggleBtn = document.getElementById('expenseToggleBtn');
        if (expenseToggleBtn) {
            expenseToggleBtn.style.display = 'inline-flex';
        }
        
        renderExpenses();
    } else if (tabName === 'summary') {
        console.log('🔍 Activating SUMMARY tab');
        updateSummary();
    } else if (tabName === 'backup') {
        updateBackupInfo();
    }
}

// Initialize navigation state
function initializeNavigation() {
    // Don't clear selectedPropertyId here - let the loaded data persist
    // The user's actual data (including selectedPropertyId) was already loaded in loadData()
    
    // Hide property navigation tabs by default (only show when property is selected)
    const propertyNav = document.getElementById('propertyNavigation');
    if (propertyNav) {
        propertyNav.style.display = 'none';
    }
    
    // Hide all property management tabs (tenants, monthly, expenses, etc.)
    const propertyTabs = ['tenants', 'monthly', 'expenses', 'summary'];
    propertyTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.classList.remove('active');
            tab.style.display = 'none';
        }
    });
    
    // Hide inline back buttons in all property management tabs
    const backButtons = ['tenantsBackButton', 'rentBackButton', 'expensesBackButton', 'summaryBackButton'];
    backButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.display = 'none';
            btn.classList.remove('visible');
        }
    });
    
    // Hide property header in tenants tab
    const propertyHeader = document.getElementById('tenantsPropertyHeader');
    if (propertyHeader) {
        propertyHeader.style.display = 'none';
        propertyHeader.classList.remove('visible');
    }
    
    // Hide property header in rent tab
    const rentPropertyHeader = document.getElementById('rentPropertyHeader');
    if (rentPropertyHeader) {
        rentPropertyHeader.style.display = 'none';
        rentPropertyHeader.classList.remove('visible');
    }
    
    // Hide property header in expenses tab
    const expensesPropertyHeader = document.getElementById('expensesPropertyHeader');
    if (expensesPropertyHeader) {
        expensesPropertyHeader.style.display = 'none';
        expensesPropertyHeader.classList.remove('visible');
    }
    
    // Hide property header in summary tab
    const summaryPropertyHeader = document.getElementById('summaryPropertyHeader');
    if (summaryPropertyHeader) {
        summaryPropertyHeader.style.display = 'none';
        summaryPropertyHeader.classList.remove('visible');
    }
    
    // Collapse the add tenant form
    const tenantFormCollapsible = document.getElementById('tenantFormCollapsible');
    if (tenantFormCollapsible) {
        tenantFormCollapsible.style.maxHeight = '0';
        tenantFormCollapsible.style.opacity = '0';
        tenantFormCollapsible.classList.add('collapsed');
    }
    
    // Hide toggle buttons
    const tenantToggleBtn = document.getElementById('tenantToggleBtn');
    if (tenantToggleBtn) tenantToggleBtn.style.display = 'none';
    
    const monthlyToggleBtn = document.getElementById('monthlyToggleBtn');
    if (monthlyToggleBtn) monthlyToggleBtn.style.display = 'none';
    
    const expenseToggleBtn = document.getElementById('expenseToggleBtn');
    if (expenseToggleBtn) expenseToggleBtn.style.display = 'none';
    
    // Show the properties tab content by default
    showTab('property');
}

// ===== EVENT LISTENERS =====

// ===== FORM INITIALIZATION =====
function initializeForms() {
    console.log('🔧 Initializing forms...');
    
    // Add new tenant form
    const addTenantForm = document.getElementById('addTenantForm');
    console.log('🔧 addTenantForm found:', !!addTenantForm);
    if (addTenantForm) {
        addTenantForm.addEventListener('submit', function(e) {
            console.log('👥 addTenantForm submit event fired');
            e.preventDefault();
            addNewTenant();
        });
        console.log('🔧 addTenantForm event listener attached');
    }

    // Tenant form (for editing overlay)
    const tenantForm = document.getElementById('tenantForm');
    console.log('🔧 tenantForm found:', !!tenantForm);
    if (tenantForm) {
        tenantForm.addEventListener('submit', function(e) {
            console.log('👥 tenantForm submit event fired');
            e.preventDefault();
            addTenant();
        });
        console.log('🔧 tenantForm event listener attached');
    }

    // Add file input change listeners for immediate display
    document.getElementById('leaseDocument').addEventListener('change', function(e) {
        const newFiles = e.target.files;
        if (newFiles && newFiles.length > 0) {
            // Combine existing files with new files (max 3)
            const combinedFiles = [...window.existingLeaseFiles];
            for (let i = 0; i < newFiles.length && combinedFiles.length < 3; i++) {
                combinedFiles.push(newFiles[i]);
            }
            
            // Create new FileList with combined files
            const dt = new DataTransfer();
            combinedFiles.forEach(file => dt.items.add(file));
            this.files = dt.files;
            
            // Update existing files storage
            window.existingLeaseFiles = combinedFiles;
            
            // Display files
            let filesHtml = '<div>';
            for (let i = 0; i < combinedFiles.length; i++) {
                filesHtml += `
                    <div>
                        <span>${combinedFiles[i].name}</span>
                        <button type="button" onclick="removeNewLeaseFile(${i})">×</button>
                    </div>
                `;
            }
            filesHtml += '</div>';
            document.getElementById('leaseDocumentDisplay').innerHTML = filesHtml;
            
            // Update upload button state
            const uploadBtn = document.getElementById('leaseUploadBtn');
            if (combinedFiles.length >= 3) {
                uploadBtn.disabled = true;
                uploadBtn.style.opacity = '0.5';
                uploadBtn.style.cursor = 'not-allowed';
                uploadBtn.textContent = 'Max 3 files';
            } else {
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = '1';
                uploadBtn.style.cursor = 'pointer';
                uploadBtn.textContent = 'Upload';
            }
        }
        
        // Update change state
        if (window.editingTenantId) {
            hasTenantFormChanged = true;
            updateTenantFormButtons();
        }
    });

    document.getElementById('tenantIdDocument').addEventListener('change', function(e) {
        const newFiles = e.target.files;
        if (newFiles && newFiles.length > 0) {
            // Combine existing files with new files (max 3)
            const combinedFiles = [...window.existingIdFiles];
            for (let i = 0; i < newFiles.length && combinedFiles.length < 3; i++) {
                combinedFiles.push(newFiles[i]);
            }
            
            // Create new FileList with combined files
            const dt = new DataTransfer();
            combinedFiles.forEach(file => dt.items.add(file));
            this.files = dt.files;
            
            // Update existing files storage
            window.existingIdFiles = combinedFiles;
            
            // Display files
            let filesHtml = '<div>';
            for (let i = 0; i < combinedFiles.length; i++) {
                filesHtml += `
                    <div>
                        <span>${combinedFiles[i].name}</span>
                        <button type="button" onclick="removeNewFile(${i})">×</button>
                    </div>
                `;
            }
            filesHtml += '</div>';
            document.getElementById('tenantIdDocumentDisplay').innerHTML = filesHtml;
            
            // Update upload button state
            const uploadBtn = document.getElementById('idUploadBtn');
            if (combinedFiles.length >= 3) {
                uploadBtn.disabled = true;
                uploadBtn.style.opacity = '0.5';
                uploadBtn.style.cursor = 'not-allowed';
                uploadBtn.textContent = 'Max 3 files';
            } else {
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = '1';
                uploadBtn.style.cursor = 'pointer';
                uploadBtn.textContent = 'Upload';
            }
        }
        
        // Update change state
        if (window.editingTenantId) {
            hasTenantFormChanged = true;
            updateTenantFormButtons();
        }
    });

    // Add file input change listeners for new tenant form
    const newLeaseDocumentEl = document.getElementById('newLeaseDocument');
    if (newLeaseDocumentEl) {
        newLeaseDocumentEl.addEventListener('change', function(e) {
            const newFiles = e.target.files;
            if (newFiles && newFiles.length > 0) {
                // Display files
                let filesHtml = '<div>';
                for (let i = 0; i < newFiles.length; i++) {
                    filesHtml += `
                        <div>
                            <span>${newFiles[i].name}</span>
                            <span style="color: #64748b; font-size: 0.75rem;"> (${(newFiles[i].size / 1024).toFixed(1)} KB)</span>
                        </div>
                    `;
                }
                filesHtml += '</div>';
                document.getElementById('newLeaseDocumentDisplay').innerHTML = filesHtml;
                
                // Update upload button state
                const uploadBtn = document.getElementById('newLeaseUploadBtn');
                if (newFiles.length >= 3) {
                    uploadBtn.disabled = true;
                    uploadBtn.style.opacity = '0.5';
                    uploadBtn.style.cursor = 'not-allowed';
                    uploadBtn.textContent = 'Max 3 files';
                } else {
                    uploadBtn.disabled = false;
                    uploadBtn.style.opacity = '1';
                    uploadBtn.style.cursor = 'pointer';
                    uploadBtn.textContent = 'Upload';
                }
            }
        });
    }

    const newTenantIdDocumentEl = document.getElementById('newTenantIdDocument');
    if (newTenantIdDocumentEl) {
        newTenantIdDocumentEl.addEventListener('change', function(e) {
            const newFiles = e.target.files;
            if (newFiles && newFiles.length > 0) {
                // Display files
                let filesHtml = '<div>';
                for (let i = 0; i < newFiles.length; i++) {
                    filesHtml += `
                        <div>
                            <span>${newFiles[i].name}</span>
                            <span style="color: #64748b; font-size: 0.75rem;"> (${(newFiles[i].size / 1024).toFixed(1)} KB)</span>
                        </div>
                    `;
                }
                filesHtml += '</div>';
                document.getElementById('newTenantIdDocumentDisplay').innerHTML = filesHtml;
                
                // Update upload button state
                const uploadBtn = document.getElementById('newIdUploadBtn');
                if (newFiles.length >= 3) {
                    uploadBtn.disabled = true;
                    uploadBtn.style.opacity = '0.5';
                    uploadBtn.style.cursor = 'not-allowed';
                    uploadBtn.textContent = 'Max 3 files';
                } else {
                    uploadBtn.disabled = false;
                    uploadBtn.style.opacity = '1';
                    uploadBtn.style.cursor = 'pointer';
                    uploadBtn.textContent = 'Upload';
                }
            }
        });
    }

    console.log('🚀 Event listeners initialization starting...');
    
    // Add change detection listeners to all form fields
    const formFields = ['tenantName', 'tenantUnit', 'tenantRent', 'tenantPhone', 'tenantEmail', 
                      'tenantSince', 'depositPaid', 'tenantNotes', 'electricityMeter', 
                      'electricityBalance', 'waterMeter', 'waterBalance', 'leaseDocument', 'tenantIdDocument'];
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('tenantForm'))));
                hasTenantFormChanged = currentState !== tenantFormInitialState;
                console.log('🔍 Input change detected:', hasTenantFormChanged);
                console.log('🔍 Current state:', currentState);
                console.log('🔍 Initial state:', tenantFormInitialState);
                updateTenantFormButtons();
            });
            field.addEventListener('change', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('tenantForm'))));
                hasTenantFormChanged = currentState !== tenantFormInitialState;
                console.log('🔍 Change event detected:', hasTenantFormChanged);
                updateTenantFormButtons();
            });
        }
    });
    
    // Special handling for file inputs since FormData doesn't capture them properly
    const fileInputs = ['leaseDocument', 'tenantIdDocument'];
    fileInputs.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('change', () => {
                console.log('🔍 File input changed:', fieldId, 'files length:', field.files.length);
                // Force change detection for file uploads
                hasTenantFormChanged = true;
                console.log('🔍 File upload change detected:', hasTenantFormChanged);
                updateTenantFormButtons();
            });
        }
    });
    
    // Add proper event listener for Cancel button
    const cancelBtn = document.getElementById('tenantCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelTenantEdit);
    }
    
    // Rent form
    document.getElementById('rentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addMonthly();
    });

    // Monthly edit form
    const monthlyEditForm = document.getElementById('rentEditForm');
    if (monthlyEditForm) {
        monthlyEditForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addMonthly();
        });
    }

    // Add change detection listeners to rent form fields
    const rentFormFields = ['rentTenant', 'rentAmount', 'rentDate', 'rentNotes'];
    const rentEditFormFields = ['rentTenantEdit', 'rentAmountEdit', 'rentDateEdit', 'rentNotesEdit'];
    
    rentFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('rentForm'))));
                hasMonthlyFormChanged = currentState !== monthlyFormInitialState;
                updateMonthlyFormButtons();
            });
            field.addEventListener('change', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('rentForm'))));
                hasMonthlyFormChanged = currentState !== monthlyFormInitialState;
                updateMonthlyFormButtons();
            });
        }
    });

    rentEditFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('rentEditForm'))));
                hasMonthlyFormChanged = currentState !== monthlyFormInitialState;
                updateMonthlyFormButtons();
            });
            field.addEventListener('change', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('rentEditForm'))));
                hasMonthlyFormChanged = currentState !== monthlyFormInitialState;
                updateMonthlyFormButtons();
            });
        }
    });
    
    // Add proper event listener for Cancel button
    const monthlyCancelBtn = document.getElementById('rentCancelBtn');
    console.log('🔍 rentCancelBtn found:', !!monthlyCancelBtn);
    if (monthlyCancelBtn) {
        monthlyCancelBtn.addEventListener('click', function() {
            console.log('🔄 Cancel button clicked!');
            cancelMonthlyEdit();
        });
        console.log('✅ Cancel button event listener attached');
    } else {
        console.error('❌ monthlyCancelBtn not found!');
    }

    // Expense form
    document.getElementById('expenseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense();
    });

    // Expense edit form
    document.getElementById('expenseEditForm').addEventListener('submit', function(e) {
        console.log('🔧 Expense edit form submitted!');
        e.preventDefault();
        addExpense();
    });

    // Add change detection listeners to expense form fields
    const expenseFormFields = ['expenseCategory', 'expenseDescription', 'expenseReference', 'expenseAmount', 'expenseDate'];
    const expenseEditFormFields = ['expenseCategoryEdit', 'expenseDescriptionEdit', 'expenseReferenceEdit', 'expenseAmountEdit', 'expenseDateEdit'];
    
    expenseFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('expenseForm'))));
                hasExpenseFormChanged = currentState !== expenseFormInitialState;
                updateExpenseFormButtons();
            });
            field.addEventListener('change', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('expenseForm'))));
                hasExpenseFormChanged = currentState !== expenseFormInitialState;
                updateExpenseFormButtons();
            });
        }
    });
    
    // Add change detection listeners to expense edit form fields
    expenseEditFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('expenseEditForm'))));
                hasExpenseFormChanged = currentState !== expenseFormInitialState;
                updateExpenseFormButtons();
            });
            field.addEventListener('change', () => {
                const currentState = JSON.stringify(Array.from(new FormData(document.getElementById('expenseEditForm'))));
                hasExpenseFormChanged = currentState !== expenseFormInitialState;
                updateExpenseFormButtons();
            });
        }
    });
    
    // Add proper event listener for Cancel button
    const expenseCancelBtn = document.getElementById('expenseCancelBtn');
    if (expenseCancelBtn) {
        expenseCancelBtn.addEventListener('click', cancelExpenseEdit);
    }

    // Property form
    const propertyForm = document.getElementById('propertyForm');
    if (propertyForm) {
        propertyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            savePropertyInfo();
        });
    }

    // Property edit form
    const propertyEditForm = document.getElementById('propertyEditForm');
    console.log('🔧 propertyEditForm found:', !!propertyEditForm);
    if (propertyEditForm) {
        propertyEditForm.addEventListener('submit', function(e) {
            console.log('🔧 propertyEditForm submit event fired');
            e.preventDefault();
            updateProperty();
        });
        
        // Add input listeners for change detection
        const propertyFields = propertyEditForm.querySelectorAll('input, select, textarea');
        console.log('🔧 Property fields found for change detection:', propertyFields.length);
        propertyFields.forEach(field => {
            field.addEventListener('input', checkPropertyFormChanges);
            field.addEventListener('change', checkPropertyFormChanges);
        });
        console.log('🔧 propertyEditForm event listeners attached');
    }

    // Query form
    const qForm = document.getElementById('queryForm');
    if (qForm) {
        qForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addQuery();
        });
    }
}

// ===== TENANT FUNCTIONS =====
function populateUnitDropdown() {
    const unitSelect = document.getElementById('newTenantUnit');
    if (!unitSelect) return;
    
    // Clear existing options
    unitSelect.innerHTML = '<option value="">Select unit...</option>';
    
    // Disable dropdown until property is selected and data is loaded
    unitSelect.disabled = true;
    
    if (!data || !data.selectedPropertyId) {
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        return;
    }
    
    // Enable dropdown since we have valid property data
    unitSelect.disabled = false;
    
    const totalUnits = selectedProperty.units || 1;
    const propertyTenants = selectedProperty.tenants || [];
    const occupiedUnits = new Set(propertyTenants.filter(t => !t.archived).map(t => String(t.unit)));
    
    // Generate unit options (1 to totalUnits)
    for (let i = 1; i <= totalUnits; i++) {
        const unitNumber = i.toString();
        const option = document.createElement('option');
        option.value = unitNumber;
        
        if (occupiedUnits.has(String(i))) {
            option.textContent = `Unit ${unitNumber} (Occupied)`;
            option.disabled = true;
            option.style.color = '#9ca3af';
        } else {
            option.textContent = `Unit ${unitNumber}`;
        }
        
        unitSelect.appendChild(option);
    }
    
    // If no units available, show message
    if (unitSelect.options.length === 1) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No units available";
        option.disabled = true;
        unitSelect.appendChild(option);
    }
}

// Setup file upload handlers for new tenant form
function setupFileUploadHandlers() {
    // Lease document upload handler
    const leaseInput = document.getElementById('newLeaseDocument');
    const leaseDisplay = document.getElementById('newLeaseDocumentDisplay');
    
    if (leaseInput && leaseDisplay) {
        leaseInput.addEventListener('change', function(e) {
            handleFileUpload(e.target.files, leaseDisplay, 'Lease');
        });
    }
    
    // ID document upload handler
    const idInput = document.getElementById('newTenantIdDocument');
    const idDisplay = document.getElementById('newTenantIdDocumentDisplay');
    
    if (idInput && idDisplay) {
        idInput.addEventListener('change', function(e) {
            handleFileUpload(e.target.files, idDisplay, 'ID');
        });
    }
}

// Handle file upload display
function handleFileUpload(files, displayElement, documentType) {
    if (!displayElement) return;
    
    displayElement.innerHTML = '';
    
    if (files.length === 0) {
        return;
    }
    
    const maxFiles = 3;
    const filesToShow = Math.min(files.length, maxFiles);
    
    for (let i = 0; i < filesToShow; i++) {
        const file = files[i];
        const fileDiv = document.createElement('div');
        fileDiv.className = 'uploaded-file';
        fileDiv.innerHTML = `
            <div class="file-info">
                <span class="file-name">📄 ${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            </div>
            <button type="button" class="remove-file" onclick="removeUploadedFile(this, '${documentType}')">×</button>
        `;
        displayElement.appendChild(fileDiv);
    }
    
    if (files.length > maxFiles) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'upload-warning';
        warningDiv.textContent = `Only first ${maxFiles} files will be saved`;
        displayElement.appendChild(warningDiv);
    }
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove uploaded file from display
function removeUploadedFile(button, documentType) {
    const fileDiv = button.parentElement;
    const displayElement = fileDiv.parentElement;
    fileDiv.remove();
    
    // Clear the corresponding file input
    const inputId = documentType === 'Lease' ? 'newLeaseDocument' : 'newTenantIdDocument';
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
}

function toggleTenantForm() {
    const el = document.getElementById('tenantFormCollapsible');
    const btn = document.getElementById('tenantToggleBtn');
    if (!el) return;

    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) {
        el.classList.remove('collapsed');
        // Allow transition by setting explicit maxHeight
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
        if (btn) btn.textContent = '➖ Hide Add Tenant';
        
        // Populate unit dropdown when form opens
        populateUnitDropdown();
        
        // Setup file upload handlers
        setupFileUploadHandlers();
    } else {
        // Smoothly collapse
        el.style.maxHeight = el.scrollHeight + 'px';
        requestAnimationFrame(() => {
            el.classList.add('collapsed');
            el.style.maxHeight = '0';
            el.style.opacity = '0';
        });
        if (btn) btn.textContent = '➕ Add New Tenant';
    }
}

function toggleMonthlyForm() {
    const el = document.getElementById('rentFormCollapsible');
    const btn = document.getElementById('rentToggleBtn');
    if (!el) return;

    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) {
        el.classList.remove('collapsed');
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
        if (btn) btn.textContent = '➖ Hide Record Payment';
        
        // Populate tenant dropdown
        updateTenantSelects();
    } else {
        el.style.maxHeight = el.scrollHeight + 'px';
        requestAnimationFrame(() => {
            el.classList.add('collapsed');
            el.style.maxHeight = '0';
            el.style.opacity = '0';
        });
        if (btn) btn.textContent = '➕ Record Payment';
    }
}

function toggleExpenseForm() {
    const el = document.getElementById('expenseFormCollapsible');
    const btn = document.getElementById('expenseToggleBtn');
    if (!el) return;

    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) {
        el.classList.remove('collapsed');
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
        if (btn) btn.textContent = '➖ Hide Add Expense';
    } else {
        el.style.maxHeight = el.scrollHeight + 'px';
        requestAnimationFrame(() => {
            el.classList.add('collapsed');
            el.style.maxHeight = '0';
            el.style.opacity = '0';
        });
        if (btn) btn.textContent = '➕ Add Expense';
    }
}

// TEST: Complete duplicate of Expenses functionality for Move Outs 2
function toggleMoveOut2Form() {
    const el = document.getElementById('moveout2FormCollapsible');
    const btn = document.getElementById('moveout2ToggleBtn');
    if (!el) return;

    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) {
        el.classList.remove('collapsed');
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
        if (btn) btn.textContent = '➖ Hide Add Move-Out 2 (TEST)';
    } else {
        el.style.maxHeight = el.scrollHeight + 'px';
        requestAnimationFrame(() => {
            el.classList.add('collapsed');
            el.style.maxHeight = '0';
            el.style.opacity = '0';
        });
        if (btn) btn.textContent = '➕ Add Move-Out 2 (TEST)';
    }
}

function addMoveOut2() {
    // Validate that a property is selected
    if (!data.selectedPropertyId) {
        showNotification('Please select a property first!');
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        showNotification('Selected property not found!');
        return;
    }
    
    // Ensure property moveOuts2 array exists
    if (!selectedProperty.moveOuts2) selectedProperty.moveOuts2 = [];
    
    const moveOut2 = {
        id: Date.now(),
        tenant: document.getElementById('moveout2Tenant').value,
        date: document.getElementById('moveout2Date').value,
        deposit: document.getElementById('moveout2Deposit').value,
        notes: document.getElementById('moveout2Notes').value,
        createdAt: new Date().toISOString()
    };

    // Add to property's moveOuts2 array
    selectedProperty.moveOuts2.push(moveOut2);
    
    // Save and update
    saveData();
    renderMoveOuts2();
    updateTenantSelects();
    updateSummary();
    
    // Reset form
    document.getElementById('moveout2Form').reset();
    
    // Hide form
    const formEl = document.getElementById('moveout2FormCollapsible');
    const btn = document.getElementById('moveout2ToggleBtn');
    formEl.style.maxHeight = formEl.scrollHeight + 'px';
    requestAnimationFrame(() => {
        formEl.classList.add('collapsed');
        formEl.style.maxHeight = '0';
        formEl.style.opacity = '0';
    });
    btn.textContent = '➕ Add Move-Out 2 (TEST)';
    
    showNotification('Move Out 2 recorded successfully!');
}

function renderMoveOuts2() {
    const container = document.getElementById('moveouts2List');
    
    // Get moveOuts2 from selected property
    let moveOuts2 = [];
    
    if (data.selectedPropertyId) {
        const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        if (selectedProperty) {
            moveOuts2 = selectedProperty.moveOuts2 || [];
        }
    }
    
    if (!moveOuts2 || moveOuts2.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚚</div>
                <div class="empty-state-text">No move outs recorded (TEST)</div>
                <div class="empty-state-subtext">Track tenant move outs (TEST VERSION)</div>
            </div>
        `;
        return;
    }

    container.innerHTML = moveOuts2.slice().reverse().map(mo => `
        <div class="entry-item">
            <div class="entry-header">
                <div class="entry-title">${mo.tenant}</div>
                <div class="entry-amount">Ksh ${mo.deposit || 0}</div>
            </div>
            <div class="entry-details">
                <div class="entry-date">${new Date(mo.date).toLocaleDateString()}</div>
                <div class="entry-description">${mo.notes || 'No notes'}</div>
            </div>
        </div>
    `).join('');
}

function deleteMoveOut2(id) {
    if (confirm('Are you sure you want to delete this move out 2?')) {
        const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        if (selectedProperty && selectedProperty.moveOuts2) {
            selectedProperty.moveOuts2 = selectedProperty.moveOuts2.filter(mo => mo.id !== id);
            saveData();
            renderMoveOuts2();
            updateSummary();
            showNotification('Move Out 2 deleted successfully!');
        }
    }
}

function toggleMoveOutForm() {
    console.log('🔄 toggleMoveOutForm called');
    const el = document.getElementById('moveoutFormCollapsible');
    const btn = document.getElementById('moveoutToggleBtn');
    console.log('🔍 MoveOut elements:', { el: !!el, btn: !!btn });
    if (!el) return;

    const isCollapsed = el.classList.contains('collapsed');
    console.log('🔍 Is collapsed:', isCollapsed);
    if (isCollapsed) {
        el.classList.remove('collapsed');
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
        if (btn) btn.textContent = '➖ Hide Add Move-Out';
        
        // Populate tenant dropdown
        updateTenantSelects();
    } else {
        el.style.maxHeight = el.scrollHeight + 'px';
        requestAnimationFrame(() => {
            el.classList.add('collapsed');
            el.style.maxHeight = '0';
            el.style.opacity = '0';
        });
        if (btn) btn.textContent = '➕ Add Move-Out';
    }
}

function toggleQueryForm() {
    console.log('🔄 toggleQueryForm called');
    const el = document.getElementById('queryFormCollapsible');
    const btn = document.getElementById('queryToggleBtn');
    console.log('🔍 Query elements:', { el: !!el, btn: !!btn });
    if (!el) return;

    const isCollapsed = el.classList.contains('collapsed');
    console.log('🔍 Is collapsed:', isCollapsed);
    if (isCollapsed) {
        el.classList.remove('collapsed');
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
        if (btn) btn.textContent = '➖ Hide Add Query';
        
        // Populate tenant dropdown
        updateTenantSelects();
    } else {
        el.style.maxHeight = el.scrollHeight + 'px';
        requestAnimationFrame(() => {
            el.classList.add('collapsed');
            el.style.maxHeight = '0';
            el.style.opacity = '0';
        });
        if (btn) btn.textContent = '➕ Add Query';
    }
}

// Add tenant
function addNewTenant() {
    console.log('👥 addNewTenant() called');
    if (!data.selectedPropertyId) {
        console.error('👥 No property selected');
        showNotification('Please select a property first');
        return;
    }

    const form = document.getElementById('addTenantForm');
    if (!form) {
        console.error('👥 addTenantForm not found');
        return;
    }

    console.log('👥 Form found, getting values...');

    // Get form values with null checks
    const tenantNameEl = document.getElementById('newTenantName');
    const tenantUnitEl = document.getElementById('newTenantUnit');
    const tenantRentEl = document.getElementById('newTenantRent');
    const tenantPhoneEl = document.getElementById('newTenantPhone');
    const tenantEmailEl = document.getElementById('newTenantEmail');
    const tenantSinceEl = document.getElementById('newTenantSince');
    const depositPaidEl = document.getElementById('newDepositPaid');
    const electricityMeterEl = document.getElementById('newElectricityMeter');
    const electricityBalanceEl = document.getElementById('newElectricityBalance');
    const waterMeterEl = document.getElementById('newWaterMeter');
    const waterBalanceEl = document.getElementById('newWaterBalance');
    const tenantNotesEl = document.getElementById('newTenantNotes');

    console.log('👥 Form elements found:', {
        tenantName: !!tenantNameEl,
        tenantUnit: !!tenantUnitEl,
        tenantRent: !!tenantRentEl,
        tenantSince: !!tenantSinceEl
    });

    const tenantName = tenantNameEl ? tenantNameEl.value.trim() : '';
    const tenantUnit = tenantUnitEl ? tenantUnitEl.value : '';
    const tenantRent = tenantRentEl ? tenantRentEl.value : '';
    const tenantPhone = tenantPhoneEl ? tenantPhoneEl.value.trim() : '';
    const tenantEmail = tenantEmailEl ? tenantEmailEl.value.trim() : '';
    const tenantSince = tenantSinceEl ? tenantSinceEl.value : '';
    const depositPaid = depositPaidEl ? depositPaidEl.value : '';
    const electricityMeter = electricityMeterEl ? electricityMeterEl.value.trim() : '';
    const electricityBalance = electricityBalanceEl ? electricityBalanceEl.value : '';
    const waterMeter = waterMeterEl ? waterMeterEl.value.trim() : '';
    const waterBalance = waterBalanceEl ? waterBalanceEl.value : '';
    const tenantNotes = tenantNotesEl ? tenantNotesEl.value.trim() : '';

    console.log('👥 Form values:', { tenantName, tenantUnit, tenantRent, tenantSince });

    // Handle document uploads with null checks
    const leaseDocumentEl = document.getElementById('newLeaseDocument');
    const idDocumentEl = document.getElementById('newTenantIdDocument');
    const leaseDocumentFiles = leaseDocumentEl ? leaseDocumentEl.files : [];
    const idDocumentFiles = idDocumentEl ? idDocumentEl.files : [];

    console.log('👥 File elements found:', {
        leaseDocument: !!leaseDocumentEl,
        idDocument: !!idDocumentEl,
        leaseFilesCount: leaseDocumentFiles ? leaseDocumentFiles.length : 0,
        idFilesCount: idDocumentFiles ? idDocumentFiles.length : 0
    });

    // Validation
    if (!tenantName || !tenantUnit || !tenantRent || !tenantSince) {
        console.error('👥 Validation failed - missing required fields');
        showNotification('Please fill in all required fields');
        return;
    }

    // Validate that a unit was selected (not the placeholder)
    if (!tenantUnit || tenantUnit === "") {
        console.error('👥 No unit selected');
        showNotification('Please select a unit');
        return;
    }

    // Check for duplicate unit within the selected property
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        console.error('👥 Selected property not found');
        showNotification('Please select a property first');
        return;
    }
    
    // No need to check for duplicate units since dropdown only shows available units
    
    // Check if property has reached its unit capacity
    const propertyTenants = (selectedProperty.tenants || []);
    const occupiedUnits = propertyTenants.filter(t => !t.archived).length;
    const maxUnits = selectedProperty.units || 1;
    
    if (occupiedUnits >= maxUnits) {
        console.error('👥 Property at maximum capacity');
        showNotification(`Property has reached maximum capacity (${maxUnits} units). Cannot add more tenants.`);
        return;
    }

    console.log('👥 Validation passed, creating tenant...');

    // Create new tenant object
    const tenant = {
        id: Date.now(),
        name: tenantName,
        unit: tenantUnit,
        rent: Number(tenantRent),
        phone: tenantPhone,
        email: tenantEmail,
        tenantSince: tenantSince, // Fixed: use consistent field name
        depositPaid: Number(depositPaid) || 0,
        electricityMeter: electricityMeter,
        electricityBalance: Number(electricityBalance) || 0,
        waterMeter: waterMeter,
        waterBalance: Number(waterBalance) || 0,
        notes: tenantNotes,
        leaseDocuments: [],
        idDocuments: [],
        // Archive fields
        tenantEnd: null,
        finalBillAmount: null,
        depositAdjustment: null,
        finalElectricityReading: null,
        finalWaterReading: null,
        archived: false,
        createdAt: new Date().toISOString()
    };

    // Process lease documents
    if (leaseDocumentFiles && leaseDocumentFiles.length > 0) {
        for (let i = 0; i < Math.min(leaseDocumentFiles.length, 3); i++) {
            const file = leaseDocumentFiles[i];
            tenant.leaseDocuments.push({
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
            });
        }
    }

    // Process ID documents
    if (idDocumentFiles && idDocumentFiles.length > 0) {
        for (let i = 0; i < Math.min(idDocumentFiles.length, 3); i++) {
            const file = idDocumentFiles[i];
            tenant.idDocuments.push({
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
            });
        }
    }

    // Add tenant to the selected property
    if (!selectedProperty.tenants) {
        selectedProperty.tenants = [];
    }
    selectedProperty.tenants.push(tenant);
    
    console.log('👥 Tenant added to property, saving data...');
    saveData();
    console.log('👥 Data saved, updating UI...');
    // Update UI
    renderTenants();
    updateTenantSelects();

    console.log('👥 UI updated, resetting form...');
    // Reset form and collapse
    form.reset();
    toggleTenantForm();

    console.log('👥 Form reset, showing success notification...');
    showNotification('Tenant added successfully!');
    console.log('👥 addNewTenant() completed successfully');
}

// Add tenant (for editing overlay)
function addTenant() {
    console.log('🔄 addTenant() called, editingTenantId:', window.editingTenantId);
    console.log('🔍 data.properties exists:', !!data.properties);
    console.log('🔍 data.properties length:', data.properties?.length);
    
    // 🔑 CRITICAL: Check editing state at the beginning
    const wasEditing = window.editingTenantId !== null;
    
    const leaseFiles = document.getElementById('leaseDocument').files;
    const idFiles = document.getElementById('tenantIdDocument').files;
    
    // Get form values
    const name = document.getElementById('tenantName').value.trim();
    const unit = document.getElementById('tenantUnit').value.trim();
    const rent = document.getElementById('tenantRent').value;
    const phone = document.getElementById('tenantPhone').value.trim();
    const email = document.getElementById('tenantEmail').value.trim();
    const since = document.getElementById('tenantSince').value;
    const depositPaid = document.getElementById('depositPaid').value;
    const notes = document.getElementById('tenantNotes').value.trim();
    const electricityMeter = document.getElementById('electricityMeter') ? document.getElementById('electricityMeter').value.trim() : '';
    const electricityBalance = document.getElementById('electricityBalance') ? parseFloat(document.getElementById('electricityBalance').value) || 0 : 0;
    const waterMeter = document.getElementById('waterMeter') ? document.getElementById('waterMeter').value.trim() : '';
    const waterBalance = document.getElementById('waterBalance') ? parseFloat(document.getElementById('waterBalance').value) || 0 : 0;
    
    // Validate required fields
    if (!name) {
        showNotification('Please enter tenant name');
        return;
    }
    
    if (!data.selectedPropertyId) {
        showNotification('Please select a property first');
        return;
    }
    
    // Use safe helper to get property
    const selectedProperty = getPropertyOrFail(data.selectedPropertyId);
    if (!selectedProperty) {
        showNotification('Selected property not found');
        return;
    }
    
    // 🔑 CRITICAL FIX: Ensure tenants array exists
    if (!Array.isArray(selectedProperty.tenants)) {
        console.warn('⚠️ Property missing tenants array, initializing:', selectedProperty.name);
        selectedProperty.tenants = [];
    }
    
    if (!unit) {
        showNotification('Please enter unit name - this is required');
        return;
    }
    
    // Check if unit is already occupied (in the selected property)
    const existingTenant = selectedProperty.tenants.find(t => 
        t.unit.toLowerCase() === unit.toLowerCase() && 
        !t.archived && 
        t.id !== window.editingTenantId
    );
    if (existingTenant) {
        showNotification(`Unit ${unit} is already occupied by ${existingTenant.name}`);
        return;
    }
    
    if (!rent || parseFloat(rent) <= 0) {
        showNotification('Please enter a valid rent amount');
        return;
    }
    
    if (!since) {
        showNotification('Please enter tenant since date');
        return;
    }
    
    console.log('✅ Validation passed, processing documents...');
    
    // Process multiple lease files
    let leaseDocuments = [];
    if (leaseFiles && leaseFiles.length > 0) {
        console.log('🔍 Processing lease files, editingTenantId:', window.editingTenantId);
        if (window.editingTenantId) {
            // Editing mode: append new files to existing documents
            const result = findTenantInAllProperties(window.editingTenantId);
            const existingTenant = result?.tenant;
            
            console.log('🔍 existingTenant after search:', existingTenant);
            const existingLeaseDocs = existingTenant?.leaseDocuments || [];
            if (existingTenant?.leaseDocument && !existingLeaseDocs.length) {
                // Convert old single format to array
                existingLeaseDocs.push(existingTenant.leaseDocument);
            }
            
            // Combine existing and new files (max 3)
            leaseDocuments = [...existingLeaseDocs];
            for (let i = 0; i < leaseFiles.length && leaseDocuments.length < 3; i++) {
                leaseDocuments.push({
                    name: leaseFiles[i].name,
                    size: leaseFiles[i].size,
                    type: leaseFiles[i].type,
                    lastModified: leaseFiles[i].lastModified
                });
            }
        } else {
            // New tenant mode: just use the new files (max 3)
            for (let i = 0; i < leaseFiles.length && i < 3; i++) {
                leaseDocuments.push({
                    name: leaseFiles[i].name,
                    size: leaseFiles[i].size,
                    type: leaseFiles[i].type,
                    lastModified: leaseFiles[i].lastModified
                });
            }
        }
    } else if (window.editingTenantId) {
        // Editing mode with no new files: keep existing documents
        const result = findTenantInAllProperties(window.editingTenantId);
        const existingTenant = result?.tenant;
        if (existingTenant) {
            leaseDocuments = existingTenant.leaseDocuments || [];
            if (existingTenant.leaseDocument && !leaseDocuments.length) {
                leaseDocuments = [existingTenant.leaseDocument];
            }
        }
    }
    
    // Process multiple ID files
    let idDocuments = [];
    if (idFiles && idFiles.length > 0) {
        if (window.editingTenantId) {
            // Editing mode: append new files to existing documents
            const result = findTenantInAllProperties(window.editingTenantId);
            const existingTenant = result?.tenant;
            const existingDocs = existingTenant?.idDocuments || [];
            if (existingTenant?.idDocument && !existingDocs.length) {
                // Convert old single format to array
                existingDocs.push(existingTenant.idDocument);
            }
            
            // Combine existing and new files (max 3)
            idDocuments = [...existingDocs];
            for (let i = 0; i < idFiles.length && idDocuments.length < 3; i++) {
                idDocuments.push({
                    name: idFiles[i].name,
                    size: idFiles[i].size,
                    type: idFiles[i].type,
                    lastModified: idFiles[i].lastModified
                });
            }
        } else {
            // New tenant mode: just use the new files (max 3)
            for (let i = 0; i < idFiles.length && i < 3; i++) {
                idDocuments.push({
                    name: idFiles[i].name,
                    size: idFiles[i].size,
                    type: idFiles[i].type,
                    lastModified: idFiles[i].lastModified
                });
            }
        }
    } else if (window.editingTenantId) {
        // Editing mode with no new files: keep existing documents
        const result = findTenantInAllProperties(window.editingTenantId);
        const existingTenant = result?.tenant;
        if (existingTenant) {
            idDocuments = existingTenant.idDocuments || [];
            if (existingTenant.idDocument && !idDocuments.length) {
                idDocuments = [existingTenant.idDocument];
            }
        }
    }
    
    const tenant = {
        id: window.editingTenantId || Date.now(),
        propertyId: data.selectedPropertyId,
        name: name,
        unit: unit,
        rent: rent,
        phone: phone,
        email: email,
        since: since,
        depositPaid: depositPaid,
        notes: notes,
        electricityMeter: electricityMeter,
        electricityBalance: electricityBalance,
        waterMeter: waterMeter,
        waterBalance: waterBalance,
        leaseDocuments: leaseDocuments,
        idDocuments: idDocuments,
        createdAt: new Date().toISOString()
    };

    console.log('🔍 Saving tenant, editingTenantId:', window.editingTenantId);
    
    if (window.editingTenantId) {
        // Update existing tenant in hierarchical structure
        console.log('🔄 Updating existing tenant:', window.editingTenantId);
        const result = findTenantInAllProperties(window.editingTenantId);
        if (result) {
            const { property } = result;
            const index = property.tenants.findIndex(t => t.id === window.editingTenantId);
            if (index !== -1) {
                console.log('✅ Found tenant to update in property:', property.name);
                property.tenants[index] = tenant;
                showNotification('Tenant updated successfully!');
            }
        }
        window.editingTenantId = null;
    } else {
        // Add new tenant to selected property
        console.log('➕ Adding new tenant to property:', selectedProperty.name);
        selectedProperty.tenants.push(tenant);
        showNotification('Tenant added successfully!');
    }
    
    console.log('💾 Saving data...');
    saveData();
    renderTenants();
    updateTenantSelects();
    
    // Handle form reset based on whether it was an edit or add operation
    if (wasEditing) {
        // This was an update, close the edit overlay and navigate back to tenants
        document.getElementById('tenantEditOverlay').classList.add('hidden');
        document.body.style.overflow = '';
        
        // Navigate back to tenants page
        showTenantsView();
        
        showNotification('Tenant updated successfully!');
    } else {
        // This was a new tenant addition, reset form
        document.getElementById('tenantForm').reset();
        
        // Reset form heading
        document.getElementById('tenantFormTitle').textContent = 'Add New Tenant';
        
        // Hide cancel button
        document.getElementById('tenantCancelBtn').classList.add('hidden');
        
        // Reset save button text
        const tenantSaveBtn = document.querySelector('#tenantForm button[type="submit"]');
        tenantSaveBtn.textContent = 'Save Tenant';
        
        // Reset document displays
        document.getElementById('leaseDocumentDisplay').innerHTML = '';
        document.getElementById('tenantIdDocumentDisplay').innerHTML = '';
        
        // Clear accumulated files
        window.existingLeaseFiles = [];
        window.existingIdFiles = [];
        
        window.idDocumentMode = 'new';
    }
}

// ===== MONTHLY PAYMENT FUNCTIONS =====
function addMonthly() {
    // Validate that a property is selected
    if (!data.selectedPropertyId) {
        showNotification('Please select a property first!');
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        showNotification('Selected property not found!');
        return;
    }
    
    // Ensure property monthly array exists
    if (!selectedProperty.monthly) selectedProperty.monthly = [];
    
    // Determine which form to use based on edit mode
    const isEditMode = window.editingMonthlyId !== null;
    const formPrefix = isEditMode ? 'Edit' : '';
    
    const tenantId = document.getElementById('rentTenant' + formPrefix).value;
    const amount = document.getElementById('rentAmount' + formPrefix).value;
    const date = document.getElementById('rentDate' + formPrefix).value;
    
    // Validate tenant selection
    if (!tenantId) {
        showNotification('Please select a tenant first!');
        return;
    }
    
    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('Please enter a valid amount');
        return;
    }
    
    // Validate date
    if (!date) {
        showNotification('Please select a date');
        return;
    }
    
    const payment = {
        id: window.editingMonthlyId || Date.now(),
        tenantId: tenantId,
        amount: amount,
        date: date,
        notes: document.getElementById('rentNotes' + formPrefix).value,
        createdAt: new Date().toISOString()
    };

    if (window.editingMonthlyId) {
        // Update existing payment
        const index = selectedProperty.monthly.findIndex(p => p.id === window.editingMonthlyId);
        if (index !== -1) {
            selectedProperty.monthly[index] = payment;
            showNotification('Payment updated successfully!');
        }
        window.editingMonthlyId = null;
    } else {
        // Add new payment to selected property
        selectedProperty.monthly.push(payment);
        showNotification('Payment recorded successfully!');
    }
    
    saveData();
    renderMonthly();
    
    if (window.editingMonthlyId === null && selectedProperty.monthly[selectedProperty.monthly.length - 1].id === payment.id) {
        // This was a new payment addition, reset form
        document.getElementById('rentForm').reset();
        setDefaultDates();
        
        // Reset save button text
        const rentSaveBtn = document.querySelector('#rentForm button[type="submit"]');
        rentSaveBtn.textContent = 'Record Payment';
        
        // Hide cancel button
        document.getElementById('rentCancelBtn').classList.add('hidden');
    } else {
        // This was an update, close overlay instead
        document.getElementById('rentEditOverlay').classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset edit form
        document.getElementById('rentEditForm').reset();
        
        // 🔑 CRITICAL: Clean up tenant display and show dropdown again
        const tenantDisplay = document.getElementById('rentTenantDisplay');
        if (tenantDisplay) {
            tenantDisplay.remove();
        }
        
        const tenantSelect = document.getElementById('rentTenantEdit');
        tenantSelect.style.display = 'block';
        
        // Reset form heading
        document.getElementById('rentFormTitle').textContent = 'Record Rent Payment';
        
        // Reset save button text
        const rentSaveBtn = document.querySelector('#rentEditForm button[type="submit"]');
        rentSaveBtn.textContent = 'Record Rent Payment';
        
        // Hide cancel button
        document.getElementById('rentCancelBtn').classList.add('hidden');
        
        showNotification('Payment updated successfully!');
    }
}

// ===== EXPENSE FUNCTIONS =====
// Prevent duplicate submissions
let isSubmittingExpense = false;

function addExpense() {
    console.log('🔧 addExpense() called!');
    console.log('🔧 editingExpenseId:', window.editingExpenseId);
    
    // Prevent duplicate submissions
    if (isSubmittingExpense) {
        console.log('🔧 Preventing duplicate submission');
        return;
    }
    
    isSubmittingExpense = true;
    
    // Validate that a property is selected
    if (!data.selectedPropertyId) {
        showNotification('Please select a property first!');
        isSubmittingExpense = false;
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        showNotification('Selected property not found!');
        isSubmittingExpense = false;
        return;
    }
    
    // Ensure property expenses array exists
    if (!selectedProperty.expenses) selectedProperty.expenses = [];
    
    // Determine which form to use based on edit mode
    const isEditMode = window.editingExpenseId !== null;
    const formPrefix = isEditMode ? 'Edit' : '';

    const expense = {
        id: window.editingExpenseId || Date.now(),
        category: document.getElementById('expenseCategory' + formPrefix).value,
        description: document.getElementById('expenseDescription' + formPrefix).value,
        reference: document.getElementById('expenseReference' + formPrefix) ? document.getElementById('expenseReference' + formPrefix).value : '',
        amount: document.getElementById('expenseAmount' + formPrefix).value,
        date: document.getElementById('expenseDate' + formPrefix).value,
        createdAt: new Date().toISOString()
    };

    // 🔑 CRITICAL: Check editing state BEFORE clearing it
    const wasEditing = window.editingExpenseId !== null;

    console.log('🔧 Before operation - expenses count:', selectedProperty.expenses.length);
    console.log('🔧 Current expenses:', selectedProperty.expenses);
    
    if (window.editingExpenseId) {
        // Update existing expense
        const index = selectedProperty.expenses.findIndex(e => e.id === window.editingExpenseId);
        console.log('🔧 Found expense at index:', index);
        if (index !== -1) {
            selectedProperty.expenses[index] = expense;
            console.log('🔧 Updated expense at index:', index);
            showNotification('Expense updated successfully!');
        }
        window.editingExpenseId = null;
    } else {
        // Add new expense to selected property
        selectedProperty.expenses.push(expense);
        console.log('🔧 Added new expense. Total count:', selectedProperty.expenses.length);
        console.log('🔧 All expenses after add:', selectedProperty.expenses);
        showNotification('Expense added successfully!');
    }
    
    saveData();
    renderExpenses();
    
    // Reset submission flag
    isSubmittingExpense = false;
    
    if (wasEditing) {
        // This was an update, close overlay and navigate to expense tab
        document.getElementById('expenseEditOverlay').classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset edit form
        document.getElementById('expenseEditForm').reset();
        
        // Reset form heading
        document.getElementById('expenseFormTitle').textContent = 'Add Expense';
        
        // Reset save button text
        const expenseSaveBtn = document.querySelector('#expenseEditForm button[type="submit"]');
        expenseSaveBtn.textContent = 'Add Expense';
        
        // Hide cancel button
        document.getElementById('expenseCancelBtn').classList.add('hidden');
        
        // Navigate to expense tab
        showTab('expenses');
        
        showNotification('Expense updated successfully!');
    } else {
        // This was a new expense addition, reset form
        document.getElementById('expenseForm').reset();
        setDefaultDates();
        
        // Reset save button text
        const expenseSaveBtn = document.querySelector('#expenseForm button[type="submit"]');
        expenseSaveBtn.textContent = 'Add Expense';
        
        // Hide cancel button
        document.getElementById('expenseCancelBtn').classList.add('hidden');
    }
}

// ===== MOVE OUT FUNCTIONS =====
function addMoveOut() {
    // Validate that a property is selected
    if (!data.selectedPropertyId) {
        showNotification('Please select a property first!');
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        showNotification('Selected property not found!');
        return;
    }
    
    // Ensure property moveOuts array exists
    if (!selectedProperty.moveOuts) selectedProperty.moveOuts = [];
    
    // Determine which form to use based on edit mode
    const isEditMode = window.editingMoveOutId !== null;
    const formPrefix = isEditMode ? 'Edit' : '';
    
    const moveOut = {
        id: window.editingMoveOutId || Date.now(),
        tenantId: document.getElementById('moveoutTenant' + formPrefix).value,
        date: document.getElementById('moveoutDate' + formPrefix).value,
        depositAdjustment: document.getElementById('archiveDepositReturned').value,
        notes: document.getElementById('moveoutNotes' + formPrefix).value,
        createdAt: new Date().toISOString()
    };

    // 🔑 CRITICAL: Check editing state BEFORE clearing it
    const wasEditing = window.editingMoveOutId !== null;

    if (window.editingMoveOutId) {
        // Update existing move out
        const index = selectedProperty.moveOuts.findIndex(m => m.id === window.editingMoveOutId);
        if (index !== -1) {
            selectedProperty.moveOuts[index] = moveOut;
            showNotification('Move out updated successfully!');
        }
        window.editingMoveOutId = null;
    } else {
        // Add new move out to selected property
        selectedProperty.moveOuts.push(moveOut);
        
        // Mark tenant as moved out and free up the unit
        const tenant = selectedProperty.tenants ? selectedProperty.tenants.find(t => t.id === moveOut.tenantId) : null;
        if (tenant) {
            console.log('Moving out tenant:', tenant.name, 'from unit:', tenant.unit);
            tenant.archived = true;
            tenant.tenantEnd = moveOut.date;
            tenant.depositAdjustment = moveOut.depositAdjustment;
            tenant.moveOutNotes = moveOut.notes;
            // IMPORTANT: Preserve the unit field for historical records
            // The unit will be available for new tenants because duplicate checking excludes archived tenants
            console.log('Tenant archived, unit preserved:', tenant.unit);
        }
        
        showNotification('Move out recorded successfully!');
    }
    
    saveData();
    renderMoveOuts();
    renderTenants(); // Re-render tenants to show moved out status
    updateTenantSelects(); // Update tenant selects to exclude moved out tenants
    
    if (wasEditing) {
        // This was an update, close overlay instead
        document.getElementById('moveOutEditOverlay').classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset edit form
        document.getElementById('moveoutEditForm').reset();
        
        // Reset form heading
        document.getElementById('moveOutFormTitle').textContent = 'Record Move Out';
        
        // Reset save button text
        const moveoutSaveBtn = document.querySelector('#moveoutEditForm button[type="submit"]');
        moveoutSaveBtn.textContent = 'Record Move Out';
        
        // Hide cancel button
        document.getElementById('moveOutCancelBtn').classList.add('hidden');
        
        showNotification('Move out updated successfully!');
    } else {
        // This was a new move out addition, reset form
        document.getElementById('moveoutForm').reset();
        setDefaultDates();
        
        // Reset save button text
        const moveoutSaveBtn = document.querySelector('#moveoutForm button[type="submit"]');
        moveoutSaveBtn.textContent = 'Record Move Out';
        
        // Hide cancel button
        document.getElementById('moveOutCancelBtn').classList.add('hidden');
    }
}

// ===== RENDER FUNCTIONS =====
function renderAllEntries() {
    renderProperties();
    
    // Only render property-specific data if a property is explicitly selected by user
    // Don't auto-show tabs on initial load - user must click a property card first
    const propertyNav = document.getElementById('propertyNavigation');
    const isPropertyTabActive = propertyNav && propertyNav.style.display !== 'none';
    
    if (data.selectedPropertyId && isPropertyTabActive) {
        renderTenants();
        renderMonthly();
        renderExpenses();
        updateSummary();
    } else {
        // Show empty states for all property-specific views
        const tenantsList = document.getElementById('tenantsList');
        if (tenantsList) {
            tenantsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <div class="empty-state-text">No property selected</div>
                    <div class="empty-state-subtext">Select a property to view tenants</div>
                </div>
            `;
        }
        
        const monthlyList = document.getElementById('monthlyList');
        if (monthlyList) {
            monthlyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No property selected</div>
                    <div class="empty-state-subtext">Select a property to view monthly records</div>
                </div>
            `;
        }
        
        const expensesList = document.getElementById('expensesList');
        if (expensesList) {
            expensesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <div class="empty-state-text">No property selected</div>
                    <div class="empty-state-subtext">Select a property to view expenses</div>
                </div>
            `;
        }
    }
}

function renderTenants() {
    console.log('🔍 renderTenants() called');
    console.log('🔍 data.selectedPropertyId:', data.selectedPropertyId);
    console.log('🔍 data.properties:', data.properties);
    
    const container = document.getElementById('tenantsList');
    if (!container) {
        console.log('❌ tenantsList container not found');
        return;
    }
    
    if (!data.selectedPropertyId) {
        console.log('🔍 No property selected - showing empty state');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-text">No property selected</div>
                <div class="empty-state-subtext">Select a property to view tenants</div>
            </div>
        `;
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    console.log('🔍 selectedProperty:', selectedProperty);
    
    if (!selectedProperty) {
        console.log('❌ Selected property not found');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-text">Property not found</div>
                <div class="empty-state-subtext">Select a valid property</div>
            </div>
        `;
        return;
    }
    
    console.log('🔍 selectedProperty.tenants:', selectedProperty.tenants);
    const propertyTenants = selectedProperty.tenants || [];
    console.log('🔍 propertyTenants count:', propertyTenants.length);

    // Filter active (non-archived) tenants
    const activeTenants = propertyTenants.filter(tenant => !tenant.archived);

    // Vacant units — normalise unit values to strings to avoid number/string mismatch
    const totalUnits = selectedProperty.units || 0;
    const occupiedUnitNumbers = new Set(activeTenants.map(t => String(t.unit)));
    const vacantUnitNumbers = [];
    for (let i = 1; i <= totalUnits; i++) {
        if (!occupiedUnitNumbers.has(String(i))) {
            vacantUnitNumbers.push(i.toString());
        }
    }
    console.log('🔍 Vacant units:', vacantUnitNumbers);

    // Only show the pure empty state when there are NO tenants at all AND no units defined
    if (propertyTenants.length === 0 && totalUnits === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No tenants yet</div>
                <div class="empty-state-subtext">Add your first tenant to get started</div>
            </div>
        `;
        return;
    }

    console.log('🔍 About to build tenants UI...');
    
    // Sort active tenants by numeric unit number
    const sortedTenants = activeTenants.slice().sort((a, b) => {
        const aNum = parseInt((a.unit || '').match(/\d+/)?.[0] || '0');
        const bNum = parseInt((b.unit || '').match(/\d+/)?.[0] || '0');
        if (aNum !== bNum) return aNum - bNum;
        return String(a.unit || '').localeCompare(String(b.unit || ''));
    });

    let html = '';

    console.log('🚀 Starting HTML generation for tenants...');
    
    if (vacantUnitNumbers.length > 0) {
        html += '<div class="vacant-units-section">';
        html += '<h3 class="section-title vacant-title">🏢 Vacant Units</h3>';
        html += '<div class="vacant-units-grid">';
        html += vacantUnitNumbers.map(unitNum => `
            <div class="vacant-unit-card" onclick="selectVacantUnit('${unitNum}')">
                <div class="vacant-unit-number">Unit ${unitNum}</div>
                <div class="vacant-unit-label">Available</div>
            </div>
        `).join('');
        html += '</div></div>';
    }
    
    // Active tenants section
    html += '<div class="tenants-section">';
    html += '<h3 class="section-title">🏠 Active Tenants</h3>';
    if (sortedTenants.length === 0) {
        html += `<div class="empty-state" style="padding: 24px 0;">
            <div class="empty-state-icon">🏠</div>
            <div class="empty-state-text">No active tenants</div>
            <div class="empty-state-subtext">All units are currently vacant — tap a vacant unit above to add a tenant</div>
        </div>`;
    }
    html += sortedTenants.map(tenant => `
        <div class="entry-card">
            <div class="entry-header">
                <div class="entry-title">${tenant.name}</div>
                <div class="entry-amount">Ksh ${tenant.rent}</div>
            </div>
            <div class="entry-details">
                <div><span class="field-label">Unit:</span> ${tenant.unit}</div>
                <div><span class="field-label">Phone:</span> ${tenant.phone || 'Not provided'}</div>
                <div><span class="field-label">Email:</span> ${tenant.email || 'Not provided'}</div>
                <div><span class="field-label">Tenant Since:</span> ${tenant.since ? new Date(tenant.since).toLocaleDateString() : 'Not specified'}</div>
                <div><span class="field-label">Initial Deposit:</span> Ksh ${tenant.depositPaid || 0}</div>
                <div><span class="field-label">Garbage Service:</span> Ksh 300/mo</div>
                <div><span class="field-label">Electricity:</span> ${tenant.electricityMeter || '—'} (Balance: Ksh ${tenant.electricityBalance || 0})</div>
                <div><span class="field-label">Water:</span> ${tenant.waterMeter || '—'} (Balance: Ksh ${tenant.waterBalance || 0})</div>
                ${tenant.notes ? `<div class="tenant-notes">${tenant.notes}</div>` : ''}
                <div class="document-status">
                    <span class="lease-status">
                        📄 Lease: ${(tenant.leaseDocuments && tenant.leaseDocuments.length > 0) ? `${tenant.leaseDocuments.length} file(s)` : (tenant.leaseDocument ? 'Uploaded' : 'Not uploaded')}
                    </span>
                    <span class="id-status">
                        🆔 ID: ${(tenant.idDocuments && tenant.idDocuments.length > 0) ? `${tenant.idDocuments.length} file(s)` : (tenant.idDocument ? 'Uploaded' : 'Not uploaded')}
                    </span>
                </div>
            </div>
            <div class="entry-actions">
                <button class="btn btn-small btn-secondary" onclick="editTenant(${tenant.id})">Edit</button>
                <button class="btn btn-small btn-warning" onclick="archiveTenant(${tenant.id})">Archive</button>
            </div>
        </div>
    `).join('');
    html += '</div>';
    
    // Archive section
    const archivedTenants = propertyTenants.filter(tenant => tenant.archived);
    console.log('🔍 Archive tenants found:', archivedTenants.length);
    
    if (archivedTenants.length > 0) {
        console.log('✅ Adding archive section to HTML');
        const sortedArchived = archivedTenants.slice().sort((a, b) => {
            const dateA = new Date(a.tenantEnd || '1970-01-01');
            const dateB = new Date(b.tenantEnd || '1970-01-01');
            return dateB - dateA; // Most recent first
        });
        
        console.log('📅 Sorted archived tenants:', sortedArchived.map(t => t.name));
        
        html += '<div class="archive-section">';
        html += '<h3 class="section-title archive-title">📦 Past Tenants (Archive)</h3>';
        html += sortedArchived.map(tenant => `
            <div class="entry-card archived-tenant">
                <div class="entry-header">
                    <div class="entry-title">${tenant.name}</div>
                    <div class="entry-amount">Ksh ${tenant.rent}</div>
                    <div class="archived-stamp">Archived</div>
                </div>
                <div class="entry-details">
                    <div><span class="field-label">Unit:</span> ${tenant.unit}</div>
                    <div><span class="field-label">Phone:</span> ${tenant.phone || 'Not provided'}</div>
                    <div><span class="field-label">Email:</span> ${tenant.email || 'Not provided'}</div>
                    <div><span class="field-label">Moved In:</span> ${tenant.since ? new Date(tenant.since).toLocaleDateString() : 'Not specified'}</div>
                    <div><span class="field-label">Moved Out:</span> ${tenant.tenantEnd ? new Date(tenant.tenantEnd).toLocaleDateString() : (tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString() : 'Not specified')}</div>
                    <div><span class="field-label">Deposit Adjustment:</span> Ksh ${tenant.depositAdjustment || 0}</div>
                    ${tenant.finalBillAmount ? `<div><span class="field-label">Final Bill:</span> Ksh ${tenant.finalBillAmount}</div>` : ''}
                    ${tenant.notes ? `<div class="tenant-notes">${tenant.notes}</div>` : ''}
                </div>
            </div>
        `).join('');
        html += '</div>';
        
        console.log('✅ Archive HTML added. Final HTML length:', html.length);
        console.log('✅ Final HTML contains archive-section:', html.includes('archive-section'));
    } else {
        console.log('❌ No archived tenants found');
    }
    
    console.log('🔍 Setting container.innerHTML...');
    container.innerHTML = html;
    console.log('✅ Container.innerHTML set. Length:', container.innerHTML.length);
    console.log('✅ Container contains archive-section:', container.innerHTML.includes('archive-section'));
}

function renderMonthly() {
    console.log('🔍 renderMonthly() called');
    const container = document.getElementById('monthlyList');
    console.log('🔍 monthlyList container found:', !!container);
    
    // Get monthly payments from selected property
    let monthlyPayments = [];
    if (data.selectedPropertyId) {
        const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        if (selectedProperty) {
            console.log('🔍 selectedProperty.monthly:', selectedProperty.monthly);
            monthlyPayments = selectedProperty.monthly || [];
            console.log('🔍 monthlyPayments count:', monthlyPayments.length);
        }
    }
    
    if (!monthlyPayments || monthlyPayments.length === 0) {
        console.log('🔍 No monthly payments - showing empty state');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <div class="empty-state-text">No payments recorded</div>
                <div class="empty-state-subtext">Start tracking monthly payments</div>
            </div>
        `;
        return;
    }

    // Get tenants from selected property for lookup
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    const propertyTenants = selectedProperty ? (selectedProperty.tenants || []) : [];

    // Sort monthly payments by date, latest first
    const sortedPayments = [...monthlyPayments].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        console.log('Sorting dates:', a.date, '->', dateA, 'vs', b.date, '->', dateB);
        return dateB - dateA;
    });
    
    container.innerHTML = sortedPayments.map(payment => {
        const tenant = propertyTenants.find(t => t.id == payment.tenantId);
        return `
            <div class="entry-card">
                <div class="entry-header">
                    <div class="entry-title">${tenant ? tenant.name : 'Unknown Tenant'}</div>
                    <div class="entry-amount">Ksh ${payment.amount}</div>
                </div>
                <div class="entry-details">
                    <div><span class="field-label">Date:</span> ${new Date(payment.date).toLocaleDateString()}</div>
                    <div class="payment-notes">${payment.notes || 'No notes'}</div>
                </div>
                <div class="entry-actions">
                    <button class="btn btn-small btn-secondary" onclick="editMonthly(${payment.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteMonthly(${payment.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderExpenses() {
    console.log('🔍 renderExpenses() called');
    console.log('🔍 data.selectedPropertyId:', data.selectedPropertyId);
    const container = document.getElementById('expensesList');
    console.log('🔍 expensesList container found:', !!container);
    
    if (!data.selectedPropertyId) {
        console.log('🔍 No selected property ID - showing empty state');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-text">No property selected</div>
                <div class="empty-state-subtext">Select a property to manage expenses</div>
            </div>
        `;
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    console.log('🔍 Selected property:', selectedProperty?.name);
    console.log('🔍 Property expenses:', selectedProperty?.expenses);
    
    if (!selectedProperty || !selectedProperty.expenses || selectedProperty.expenses.length === 0) {
        console.log('🔍 No expenses found - showing empty state');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No expenses recorded</div>
                <div class="empty-state-subtext">Track your property expenses</div>
            </div>
        `;
        return;
    }
    
    console.log('🔍 Rendering expenses list');
    console.log('🔧 Expenses to render:', selectedProperty.expenses);
    
    // Filter out any invalid expenses (empty or missing required fields)
    const validExpenses = selectedProperty.expenses.filter(expense => {
        const isValid = expense && expense.description && expense.amount && expense.date;
        if (!isValid) {
            console.log('🔧 Filtering out invalid expense:', expense);
        }
        return isValid;
    });
    
    console.log('🔧 Valid expenses after filtering:', validExpenses);
    
    // Sort expenses by date, latest first
    const sortedExpenses = [...validExpenses].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
    console.log('🔧 Sorted expenses:', sortedExpenses);
    
    container.innerHTML = sortedExpenses.map(expense => `
        <div class="entry-card">
            <div class="entry-header">
                <div class="entry-title">${expense.description}</div>
                <div class="entry-amount">Ksh ${expense.amount}</div>
            </div>
            <div class="entry-details">
                <div><span class="field-label">Category:</span> ${expense.category}</div>
                <div><span class="field-label">Date:</span> ${new Date(expense.date).toLocaleDateString()}</div>
                ${expense.reference ? `<div><span class="field-label">Reference:</span> ${expense.reference}</div>` : ''}
            </div>
            <div class="entry-actions">
                <button class="btn btn-small btn-secondary" onclick="editExpense(${expense.id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteExpense(${expense.id})">Delete</button>
            </div>
        </div>
    `).join('');
    
    console.log('✅ renderExpenses completed');
}

function renderMoveOuts() {
    const container = document.getElementById('moveoutsList');
    
    if (!data.selectedPropertyId) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-text">No property selected</div>
                <div class="empty-state-subtext">Go to Properties tab and select a property to manage</div>
            </div>
        `;
        return;
    }
    
    // Get move outs from selected property
    let moveOuts = [];
    let propertyTenants = [];
    
    if (data.selectedPropertyId) {
        const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        if (selectedProperty) {
            moveOuts = selectedProperty.moveOuts || [];
            propertyTenants = selectedProperty.tenants || [];
        }
    }
    
    if (!moveOuts || moveOuts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚚</div>
                <div class="empty-state-text">No move outs recorded</div>
                <div class="empty-state-subtext">Track tenant move outs for this property</div>
            </div>
        `;
        return;
    }

    container.innerHTML = moveOuts.map(moveOut => {
        const tenant = propertyTenants.find(t => t.id === moveOut.tenantId);
        return `
            <div class="entry-card">
                <div class="entry-header">
                    <div class="entry-title">${tenant ? tenant.name : 'Unknown Tenant'}</div>
                    <div class="entry-amount">Ksh ${moveOut.depositAdjustment || 0}</div>
                </div>
                <div class="entry-details">
                    <div><span class="field-label">Unit:</span> ${tenant ? tenant.unit : 'Unknown'}</div>
                    <div><span class="field-label">Move Out Date:</span> ${new Date(moveOut.date).toLocaleDateString()}</div>
                    <div>${moveOut.notes || 'No notes'}</div>
                </div>
                <div class="entry-actions">
                    <button class="btn btn-small btn-secondary" onclick="editMoveOut(${moveOut.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteMoveOut(${moveOut.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Update tenant selects (including summary tenant select)
function updateTenantSelects() {
    const rentSelect = document.getElementById('rentTenant');
    const rentEditSelect = document.getElementById('rentTenantEdit');

    // Get tenants from selected property using hierarchical structure
    let propertyTenants = [];
    if (data.selectedPropertyId) {
        const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        if (selectedProperty && selectedProperty.tenants) {
            propertyTenants = selectedProperty.tenants;
        }
    }

    // Filter out moved out and archived tenants for selects
    const activeTenants = propertyTenants.filter(t => !t.archived);

    const tenantsList = activeTenants.slice().sort((a, b) => {
        const aNum = parseInt((a.unit || '').match(/\d+/)?.[0] || '0');
        const bNum = parseInt((b.unit || '').match(/\d+/)?.[0] || '0');
        if (aNum !== bNum) return aNum - bNum;
        return String(a.unit || '').localeCompare(String(b.unit || ''));
    });

    const tenantOptions = tenantsList.map(tenant => `<option value="${tenant.id}">${tenant.name} - ${tenant.unit}</option>`).join('');
    
    // For rent, only show active tenants
    const options = '<option value="">Choose a tenant...</option>' + tenantOptions;
    
    if (rentSelect) rentSelect.innerHTML = options;
    if (rentEditSelect) rentEditSelect.innerHTML = options;
}

// ===== ARCHIVE FUNCTIONS =====
function archiveTenant(id) {
    // Show the new archive modal instead of simple confirm
    showArchiveModal(id);
}

// ===== VACANT UNIT FUNCTIONS =====
function selectVacantUnit(unitNumber) {
    // Expand the add tenant form
    const formCollapsible = document.getElementById('tenantFormCollapsible');
    if (formCollapsible && formCollapsible.classList.contains('collapsed')) {
        toggleTenantForm();
    }
    
    // Set the unit dropdown value
    setTimeout(() => {
        const unitSelect = document.getElementById('newTenantUnit');
        if (unitSelect) {
            unitSelect.value = unitNumber;
        }
    }, 100);
    
    // Focus on tenant name field
    const nameInput = document.getElementById('newTenantName');
    if (nameInput) {
        nameInput.focus();
    }
}

// ===== DELETE FUNCTIONS =====
function deleteTenant(id) {
    if (confirm('Are you sure you want to delete this tenant?')) {
        // Delete tenant from hierarchical structure
        for (const property of data.properties) {
            if (property.tenants) {
                const index = property.tenants.findIndex(t => t.id === id);
                if (index !== -1) {
                    property.tenants.splice(index, 1);
                    break;
                }
            }
        }
        saveData();
        renderTenants();
        showToast('Tenant deleted', 'success');
        updateTenantSelects();
    }
}

function deleteMonthly(id) {
    if (confirm('Are you sure you want to delete this payment?')) {
        // Find and delete payment in hierarchical structure
        let deleted = false;
        for (const property of data.properties) {
            if (property.monthly) {
                const index = property.monthly.findIndex(m => m.id === id);
                if (index !== -1) {
                    property.monthly.splice(index, 1);
                    deleted = true;
                    break;
                }
            }
        }
        
        if (deleted) {
            saveData();
            renderMonthly();
            showToast('Payment deleted', 'success');
        } else {
            showNotification('Payment not found');
        }
    }
}

function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        // Find and delete expense in hierarchical structure
        let deleted = false;
        for (const property of data.properties) {
            if (property.expenses) {
                const index = property.expenses.findIndex(e => e.id === id);
                if (index !== -1) {
                    property.expenses.splice(index, 1);
                    deleted = true;
                    break;
                }
            }
        }
        
        if (deleted) {
            saveData();
            renderExpenses();
            showToast('Expense deleted', 'success');
        } else {
            showNotification('Expense not found');
        }
    }
}

function deleteMoveOut(id) {
    if (confirm('Are you sure you want to delete this move out record?')) {
        // Find and delete move out in hierarchical structure
        let deleted = false;
        for (const property of data.properties) {
            if (property.moveOuts) {
                const index = property.moveOuts.findIndex(m => m.id === id);
                if (index !== -1) {
                    property.moveOuts.splice(index, 1);
                    deleted = true;
                    break;
                }
            }
        }
        
        if (deleted) {
            saveData();
            renderMoveOuts();
            showToast('Move out deleted', 'success');
        } else {
            showNotification('Move out record not found');
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const monthlyDate = document.getElementById('monthlyDate');
    const expenseDate = document.getElementById('expenseDate');
    const moveoutDate = document.getElementById('moveoutDate');
    const tenantSince = document.getElementById('tenantSince');
    
    if (monthlyDate) monthlyDate.value = today;
    if (expenseDate) expenseDate.value = today;
    if (moveoutDate) moveoutDate.value = today;
    if (tenantSince) tenantSince.value = today;
}

function updateLastSaved() {
    const now = new Date().toLocaleTimeString();
    const lastSavedEl = document.getElementById('lastSaved');
    if (lastSavedEl) {
        lastSavedEl.textContent = 'Saved at ' + now;
    }
}

function showSaveIndicator() {
    const statusDot = document.getElementById('statusDot');
    statusDot.style.background = '#10b981';
    setTimeout(() => {
        statusDot.style.background = '';
    }, 1000);
}

// ===== PWA FUNCTIONS =====
function initializePWA() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install prompt
        const installPrompt = document.createElement('div');
        installPrompt.className = 'install-prompt';
        installPrompt.innerHTML = `
            <h4>📱 Install Rental Manager</h4>
            <p>Add this app to your home screen for quick access!</p>
            <button class="btn btn-primary" onclick="installApp()">Install App</button>
            <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="margin-left: 8px;">Not Now</button>
        `;
        
        document.querySelector('.content-area').prepend(installPrompt);
    });
    
    window.installApp = async function() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            
            // Remove install prompt
            const prompt = document.querySelector('.install-prompt');
            if (prompt) prompt.remove();
            
            if (outcome === 'accepted') {
                showNotification('App installed successfully!');
            }
        }
    };
}

// ===== ONLINE/OFFLINE STATUS =====
window.addEventListener('online', () => {
    document.getElementById('statusDot').classList.remove('offline');
    document.getElementById('statusText').textContent = 'Online';
});

window.addEventListener('offline', () => {
    document.getElementById('statusDot').classList.add('offline');
    document.getElementById('statusText').textContent = 'Offline';
});

// ===== SUMMARY FUNCTIONS =====
function updateSummary() {
    console.log('🔍 Rendering summary for selected property:', data.selectedPropertyId);
    
    // Check if Summary tab is visible
    const summaryTab = document.getElementById('summary');
    if (summaryTab) {
        console.log('🔍 Summary tab found:', summaryTab);
        console.log('🔍 Summary tab classes:', summaryTab.className);
        console.log('🔍 Summary tab display:', window.getComputedStyle(summaryTab).display);
        console.log('🔍 Summary tab visibility:', window.getComputedStyle(summaryTab).visibility);
        
        // Force show the summary tab
        summaryTab.style.display = 'block !important';
        summaryTab.style.visibility = 'visible !important';
        summaryTab.classList.add('active');
    } else {
        console.log('❌ Summary tab not found');
        return;
    }
    
    // Check if summary elements exist and force visibility
    const summaryCards = document.getElementById('summaryCards');
    const incomeEl = document.querySelector('.summary-amount.income');
    const expenseEl = document.querySelector('.summary-amount.expense');
    const netEl = document.querySelector('.summary-amount.net');
    
    console.log('🔍 Summary elements found:', {
        summaryCards: !!summaryCards,
        incomeEl: !!incomeEl,
        expenseEl: !!expenseEl,
        netEl: !!netEl
    });
    
    if (!summaryCards || !incomeEl || !expenseEl || !netEl) {
        console.log('❌ CRITICAL: Summary DOM elements missing!');
        return;
    }
    
    // Force visibility of summary cards container
    summaryCards.style.display = 'grid !important';
    summaryCards.style.visibility = 'visible !important';
    console.log('✅ Forced summary cards visibility');
    
    // Calculate totals for SELECTED PROPERTY ONLY (like other tabs)
    let totalIncome = 0;
    let totalExpenses = 0;
    let selectedProperty = null;
    
    // Find the selected property (same pattern as other tabs)
    if (data.selectedPropertyId && data.properties) {
        selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        console.log('🏠 Found selected property:', selectedProperty?.name);
    }
    
    if (!selectedProperty) {
        console.log('🔍 No selected property - showing empty state');
        // Show empty state instead of returning
        incomeEl.textContent = 'Ksh 0';
        expenseEl.textContent = 'Ksh 0';
        netEl.textContent = 'Ksh 0';
        
        // Update monthly summary to show no property selected
        const rentSummaryCards = document.getElementById('rentSummaryCards');
        if (rentSummaryCards) {
            rentSummaryCards.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <div class="empty-state-text">No property selected</div>
                    <div class="empty-state-subtext">Select a property to see reports</div>
                </div>
            `;
        }
        return;
    }
    
    // Calculate totals for the selected property only
    console.log('🏠 Processing selected property:', selectedProperty.name);
    
    // Sum monthly income for selected property
    if (selectedProperty.monthly && selectedProperty.monthly.length > 0) {
        selectedProperty.monthly.forEach(record => {
            const amount = parseFloat(record.amount) || 0;
            totalIncome += amount;
            console.log('💰 Adding income:', amount, 'Total now:', totalIncome);
        });
    }
    
    // Sum expenses for selected property
    if (selectedProperty.expenses && selectedProperty.expenses.length > 0) {
        selectedProperty.expenses.forEach(record => {
            const amount = parseFloat(record.amount) || 0;
            totalExpenses += amount;
            console.log('💳 Adding expense:', amount, 'Total now:', totalExpenses);
        });
    }
    
    const netIncome = totalIncome - totalExpenses;
    
    console.log('📊 FINAL TOTALS for', selectedProperty.name + ':', {
        totalIncome,
        totalExpenses,
        netIncome
    });
    
    // Update summary cards with forced visibility
    incomeEl.textContent = `Ksh ${totalIncome.toLocaleString()}`;
    incomeEl.style.display = 'block !important';
    incomeEl.style.visibility = 'visible !important';
    incomeEl.parentElement.style.display = 'block !important';
    incomeEl.parentElement.style.visibility = 'visible !important';
    console.log('✅ Updated income element:', incomeEl.textContent);
    
    expenseEl.textContent = `Ksh ${totalExpenses.toLocaleString()}`;
    expenseEl.style.display = 'block !important';
    expenseEl.style.visibility = 'visible !important';
    expenseEl.parentElement.style.display = 'block !important';
    expenseEl.parentElement.style.visibility = 'visible !important';
    console.log('✅ Updated expense element:', expenseEl.textContent);
    
    netEl.textContent = `Ksh ${netIncome.toLocaleString()}`;
    netEl.style.display = 'block !important';
    netEl.style.visibility = 'visible !important';
    netEl.parentElement.style.display = 'block !important';
    netEl.parentElement.style.visibility = 'visible !important';
    console.log('✅ Updated net element:', netEl.textContent);
    
    // Update monthly summary cards for selected property
    const rentSummaryCards = document.getElementById('rentSummaryCards');
    if (rentSummaryCards) {
        // Group monthly payments by month
        const monthlyData = {};
        
        // Process monthly payments
        if (selectedProperty.monthly && selectedProperty.monthly.length > 0) {
            selectedProperty.monthly.forEach(payment => {
                const month = payment.date.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        income: 0,
                        expenses: 0,
                        month: month
                    };
                }
                monthlyData[month].income += parseFloat(payment.amount) || 0;
            });
        }
        
        // Process expenses
        if (selectedProperty.expenses && selectedProperty.expenses.length > 0) {
            selectedProperty.expenses.forEach(expense => {
                const month = expense.date.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        income: 0,
                        expenses: 0,
                        month: month
                    };
                }
                monthlyData[month].expenses += parseFloat(expense.amount) || 0;
            });
        }
        
        // Sort months in descending order (most recent first)
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
        
        if (sortedMonths.length === 0) {
            rentSummaryCards.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📈</div>
                    <div class="empty-state-text">No data to summarize</div>
                    <div class="empty-state-subtext">Add tenants and payments to see reports</div>
                </div>
            `;
        } else {
            let cardsHTML = '<div class="monthly-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';
            
            sortedMonths.forEach(month => {
                const data = monthlyData[month];
                const net = data.income - data.expenses;
                const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                
                cardsHTML += `
                    <div class="monthly-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 1.1rem; font-weight: 600;">${monthName}</h4>
                        <div style="display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b; font-size: 0.9rem;">Income</span>
                                <span style="color: #059669; font-weight: 600;">Ksh ${data.income.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b; font-size: 0.9rem;">Expenses</span>
                                <span style="color: #dc2626; font-weight: 600;">Ksh ${data.expenses.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                                <span style="color: #374151; font-size: 0.9rem; font-weight: 600;">Net</span>
                                <span style="color: ${net >= 0 ? '#059669' : '#dc2626'}; font-weight: 700; font-size: 1rem;">Ksh ${net.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            cardsHTML += '</div>';
            rentSummaryCards.innerHTML = cardsHTML;
        }
        
        console.log('✅ Updated monthly summary cards for selected property');
    }
    
    console.log('🎯 updateSummary completed successfully for selected property');
}

// ===== BACKUP FUNCTIONS =====
function updateBackupInfo() {
    const dataSize = JSON.stringify(data).length;
    const dataSizeKB = (dataSize / 1024).toFixed(2);
    const lastSaved = localStorage.getItem('lastSaved') || 'Never';
    const syncStatusText = isOnline ? 'Synced to cloud' : 'Syncing locally';
    
    document.getElementById('lastBackup').textContent = lastSaved;
    document.getElementById('dataSize').textContent = `${dataSizeKB} KB`;
    const syncElement = document.getElementById('cloudSyncStatus');
    if (syncElement) {
        syncElement.textContent = syncStatusText;
    }
}

function exportData() {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inzu-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!');
}

function exportCSV() {
    let csv = '';
    
    // ===== ACCOUNTS BY PROPERTY =====
    csv += 'ACCOUNTS BY PROPERTY\n';
    csv += 'Property Name,Address,Type,Units,Total Tenants,Monthly Income,Total Expenses,Net Income\n';
    
    data.properties.forEach(property => {
        const tenants = property.tenants || [];
        const monthlyPayments = property.monthly || [];
        const expenses = property.expenses || [];
        
        const totalTenants = tenants.length;
        const monthlyIncome = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const netIncome = monthlyIncome - totalExpenses;
        
        csv += `"${property.name}","${property.address}","${property.type}",${property.units},${totalTenants},${monthlyIncome},${totalExpenses},${netIncome}\n`;
    });
    
    csv += '\n';
    
    // ===== ACCOUNTS BY TENANT =====
    csv += 'ACCOUNTS BY TENANT\n';
    csv += 'Property Name,Unit,Tenant Name,Phone,Email,Rent Amount,Tenant Since,Total Paid,Deposit Paid,Balance\n';
    
    data.properties.forEach(property => {
        if (property.tenants) {
            property.tenants.forEach(tenant => {
                const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
                const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                
                // Calculate projected balance: (rent * months since tenant started) - total paid
                const monthsSinceStart = tenant.tenantSince ? 
                    Math.max(1, Math.floor((new Date() - new Date(tenant.tenantSince)) / (1000 * 60 * 60 * 24 * 30))) : 1;
                const serviceChargeTotal = monthsSinceStart * 300;
                const expectedTotal = (tenant.rent * monthsSinceStart) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
                const balance = totalPaid - expectedTotal;
                
                // Format date properly
                const formattedDate = tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : '';
                
                csv += `"${property.name}","${tenant.unit}","${tenant.name}","${tenant.phone || ''}","${tenant.email || ''}","${Number(tenant.rent || 0).toFixed(2)}","${formattedDate}","${Number(totalPaid || 0).toFixed(2)}","${Number(tenant.depositPaid || 0).toFixed(2)}","${Number(balance || 0).toFixed(2)}"\n`;
            });
        }
    });
    
    csv += '\n';
    
    // ===== DETAILED PAYMENT HISTORY =====
    csv += 'DETAILED PAYMENT HISTORY\n';
    csv += 'Date,Property Name,Tenant Name,Unit,Amount,Payment Type,Notes\n';
    
    data.properties.forEach(property => {
        if (property.monthly) {
            property.monthly.forEach(payment => {
                const tenant = property.tenants?.find(t => t.id == payment.tenantId);
                csv += `"${payment.date}","${property.name}","${tenant ? tenant.name : 'Unknown'}","${tenant ? tenant.unit : 'N/A'}",${payment.amount},"Rent","${payment.notes || ''}"\n`;
            });
        }
    });
    
    csv += '\n';
    
    // ===== EXPENSE TRACKING =====
    csv += 'EXPENSE TRACKING\n';
    csv += 'Date,Property Name,Category,Description,Amount,Reference\n';
    
    data.properties.forEach(property => {
        if (property.expenses) {
            property.expenses.forEach(expense => {
                csv += `"${expense.date}","${property.name}","${expense.category}","${expense.description}",${expense.amount},"${expense.reference || ''}"\n`;
            });
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inzu-accounts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('CSV exported successfully!');
}

// ===== EXPORT DIALOG FUNCTIONS =====
function showExportDialog() {
    const dialog = document.getElementById('exportDialog');
    const propertyFilter = document.getElementById('exportPropertyFilter');
    const tenantFilter = document.getElementById('exportTenantFilter');
    
    // Clear previous options
    propertyFilter.innerHTML = '<option value="all">All Properties</option>';
    tenantFilter.innerHTML = '<option value="all">All Tenants</option>';
    
    // Populate property filter
    data.properties.forEach(property => {
        const option = document.createElement('option');
        option.value = property.id;
        option.textContent = property.name;
        propertyFilter.appendChild(option);
    });
    
    // Populate tenant filter
    data.properties.forEach(property => {
        if (property.tenants) {
            property.tenants.forEach(tenant => {
                const option = document.createElement('option');
                option.value = tenant.id;
                option.textContent = `${tenant.name} (${property.name})`;
                tenantFilter.appendChild(option);
            });
        }
    });
    
    dialog.style.display = 'flex';
}

function closeExportDialog() {
    const dialog = document.getElementById('exportDialog');
    dialog.style.display = 'none';
}

function generateExport() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    const includeProperties = document.getElementById('exportProperties').checked;
    const includeTenants = document.getElementById('exportTenants').checked;
    const includeMonthly = document.getElementById('exportMonthly').checked;
    const includeExpenses = document.getElementById('exportExpenses').checked;
    const propertyFilter = document.getElementById('exportPropertyFilter').value;
    const tenantFilter = document.getElementById('exportTenantFilter').value;
    
    // Filter data based on selections
    let filteredProperties = data.properties;
    if (propertyFilter !== 'all') {
        filteredProperties = data.properties.filter(p => p.id == propertyFilter);
    }
    
    if (exportType === 'csv') {
        generateFilteredCSV(filteredProperties, includeProperties, includeTenants, includeMonthly, includeExpenses, tenantFilter);
    } else {
        generateFilteredExcel(filteredProperties, includeProperties, includeTenants, includeMonthly, includeExpenses, tenantFilter);
    }
    
    closeExportDialog();
}

function generateFilteredCSV(properties, includeProperties, includeTenants, includeMonthly, includeExpenses, tenantFilter) {
    let csv = '';
    
    // ===== ACCOUNTS BY PROPERTY =====
    if (includeProperties) {
        csv += 'ACCOUNTS BY PROPERTY\n';
        csv += 'Property Name,Address,Type,Units,Total Tenants,Monthly Income,Total Expenses,Net Income\n';
        
        properties.forEach(property => {
            const tenants = property.tenants || [];
            const monthlyPayments = property.monthly || [];
            const expenses = property.expenses || [];
            
            // Apply tenant filter if specified
            let filteredTenants = tenants;
            let filteredMonthly = monthlyPayments;
            let filteredExpenses = expenses;
            
            if (tenantFilter !== 'all') {
                filteredTenants = tenants.filter(t => t.id == tenantFilter);
                filteredMonthly = monthlyPayments.filter(p => p.tenantId == tenantFilter);
            }
            
            const totalTenants = filteredTenants.length;
            const monthlyIncome = filteredMonthly.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const netIncome = monthlyIncome - totalExpenses;
            
            csv += `"${property.name}","${property.address}","${property.type}",${property.units},${totalTenants},${monthlyIncome},${totalExpenses},${netIncome}\n`;
        });
        
        csv += '\n';
    }
    
    // ===== ACCOUNTS BY TENANT =====
    if (includeTenants) {
        csv += 'ACCOUNTS BY TENANT\n';
        csv += 'Property Name,Unit,Tenant Name,Phone,Email,Rent Amount,Tenant Since,Total Paid,Deposit Paid,Balance\n';
        
        properties.forEach(property => {
            if (property.tenants) {
                property.tenants.forEach(tenant => {
                    if (tenantFilter !== 'all' && tenant.id != tenantFilter) return;
                    
                    const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
                    const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                    
                    // Calculate projected balance: (rent * months since tenant started) - total paid
                    const monthsSinceStart = tenant.tenantSince ? 
                        Math.max(1, Math.floor((new Date() - new Date(tenant.tenantSince)) / (1000 * 60 * 60 * 24 * 30))) : 1;
                    const projectedRent = tenant.rent * monthsSinceStart;
                    const balance = projectedRent - totalPaid;
                    
                    // Format date properly
                    const formattedDate = tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : '';
                    
                    csv += `"${property.name}","${tenant.unit}","${tenant.name}","${tenant.phone || ''}","${tenant.email || ''}","${Number(tenant.rent || 0).toFixed(2)}","${formattedDate}","${Number(totalPaid || 0).toFixed(2)}","${Number(tenant.depositPaid || 0).toFixed(2)}","${Number(balance || 0).toFixed(2)}"\n`;
                });
            }
        });
        
        csv += '\n';
    }
    
    // ===== DETAILED PAYMENT HISTORY =====
    if (includeMonthly) {
        csv += 'DETAILED PAYMENT HISTORY\n';
        csv += 'Date,Property Name,Tenant Name,Unit,Amount,Payment Type,Notes\n';
        
        properties.forEach(property => {
            if (property.monthly) {
                property.monthly.forEach(payment => {
                    if (tenantFilter !== 'all' && payment.tenantId != tenantFilter) return;
                    
                    const tenant = property.tenants?.find(t => t.id == payment.tenantId);
                    csv += `"${payment.date}","${property.name}","${tenant ? tenant.name : 'Unknown'}","${tenant ? tenant.unit : 'N/A'}",${payment.amount},"Rent","${payment.notes || ''}"\n`;
                });
            }
        });
        
        csv += '\n';
    }
    
    // ===== EXPENSE TRACKING =====
    if (includeExpenses) {
        csv += 'EXPENSE TRACKING\n';
        csv += 'Date,Property Name,Category,Description,Amount,Reference\n';
        
        properties.forEach(property => {
            if (property.expenses) {
                property.expenses.forEach(expense => {
                    csv += `"${expense.date}","${property.name}","${expense.category}","${expense.description}",${expense.amount},"${expense.reference || ''}"\n`;
                });
            }
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inzu-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('CSV exported successfully!');
}

function generateFilteredExcel(properties, includeProperties, includeTenants, includeMonthly, includeExpenses, tenantFilter) {
    const workbook = {
        SheetNames: [],
        Sheets: {}
    };
    
    // ===== PROPERTY OVERVIEW SHEET =====
    if (includeProperties) {
        const propertyData = [
            ['Property Name', 'Address', 'Type', 'Units', 'Total Tenants', 'Monthly Income', 'Total Expenses', 'Net Income']
        ];
        
        properties.forEach(property => {
            const tenants = property.tenants || [];
            const monthlyPayments = property.monthly || [];
            const expenses = property.expenses || [];
            
            // Apply tenant filter if specified
            let filteredTenants = tenants;
            let filteredMonthly = monthlyPayments;
            let filteredExpenses = expenses;
            
            if (tenantFilter !== 'all') {
                filteredTenants = tenants.filter(t => t.id == tenantFilter);
                filteredMonthly = monthlyPayments.filter(p => p.tenantId == tenantFilter);
            }
            
            const totalTenants = filteredTenants.length;
            const monthlyIncome = filteredMonthly.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const netIncome = monthlyIncome - totalExpenses;
            
            propertyData.push([
                property.name,
                property.address,
                property.type,
                property.units,
                totalTenants,
                monthlyIncome,
                totalExpenses,
                netIncome
            ]);
        });
        
        const propertyWS = worksheetFromArrayOfArrays(propertyData);
        workbook.SheetNames.push('Property Overview');
        workbook.Sheets['Property Overview'] = propertyWS;
    }
    
    // ===== DETAILED TENANT ACCOUNTS SHEET =====
    if (includeTenants) {
        const tenantData = [
            ['Property Name', 'Unit', 'Tenant Name', 'Phone', 'Email', 'Rent Amount', 'Tenant Since', 'Total Paid', 'Deposit Paid', 'Balance', 'Status']
        ];
        
        properties.forEach(property => {
            if (property.tenants) {
                property.tenants.forEach(tenant => {
                    if (tenantFilter !== 'all' && tenant.id != tenantFilter) return;
                    
                    const monthlyPayments = property.monthly?.filter(p => p.tenantId == tenant.id) || [];
                    const totalPaid = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                    const monthsCount = monthlyPayments.length;
    const serviceChargeTotal = monthsCount * 300;
    const expectedTotal = (tenant.rent * monthsCount) + serviceChargeTotal + (Number(tenant.depositPaid) || 0);
    const balance = totalPaid - expectedTotal;
                    const status = balance < 0 ? 'Payment Required' : 'Balanced';
                    
                    // Format date properly
                    const formattedDate = tenant.tenantSince ? new Date(tenant.tenantSince).toLocaleDateString('en-GB') : '';
                    
                    tenantData.push([
                        property.name,
                        tenant.unit,
                        tenant.name,
                        tenant.phone || '',
                        tenant.email || '',
                        Number(tenant.rent || 0).toFixed(2),
                        formattedDate,
                        Number(totalPaid || 0).toFixed(2),
                        Number(tenant.depositPaid || 0).toFixed(2),
                        Number(balance || 0).toFixed(2),
                        status
                    ]);
                });
            }
        });
        
        const tenantWS = worksheetFromArrayOfArrays(tenantData);
        workbook.SheetNames.push('Tenant Accounts');
        workbook.Sheets['Tenant Accounts'] = tenantWS;
    }
    
    // ===== RENT PAYMENT HISTORY SHEET =====
    if (includeMonthly) {
        const paymentData = [
            ['Payment Date', 'Property Name', 'Tenant Name', 'Unit', 'Amount', 'Payment Method', 'Payment Type', 'Notes', 'Status']
        ];
        
        properties.forEach(property => {
            if (property.monthly) {
                property.monthly.forEach(payment => {
                    if (tenantFilter !== 'all' && payment.tenantId != tenantFilter) return;
                    
                    const tenant = property.tenants?.find(t => t.id == payment.tenantId);
                    paymentData.push([
                        payment.date,
                        property.name,
                        tenant ? tenant.name : 'Unknown',
                        tenant ? tenant.unit : 'N/A',
                        payment.amount,
                        payment.method || 'Cash',
                        'Rent',
                        payment.notes || '',
                        'Paid'
                    ]);
                });
            }
        });
        
        const paymentWS = worksheetFromArrayOfArrays(paymentData);
        workbook.SheetNames.push('Rent Payments');
        workbook.Sheets['Rent Payments'] = paymentWS;
    }
    
    // ===== EXPENSE TRACKING SHEET =====
    if (includeExpenses) {
        const expenseData = [
            ['Expense Date', 'Property Name', 'Category', 'Description', 'Amount', 'Reference', 'Status']
        ];
        
        properties.forEach(property => {
            if (property.expenses) {
                property.expenses.forEach(expense => {
                    expenseData.push([
                        expense.date,
                        property.name,
                        expense.category,
                        expense.description,
                        expense.amount,
                        expense.reference || '',
                        'Paid'
                    ]);
                });
            }
        });
        
        const expenseWS = worksheetFromArrayOfArrays(expenseData);
        workbook.SheetNames.push('Expenses');
        workbook.Sheets['Expenses'] = expenseWS;
    }
    
    // ===== FINANCIAL SUMMARY SHEET =====
    if (includeProperties && (includeMonthly || includeExpenses)) {
        const summaryData = [
            ['Property Name', 'Total Income', 'Total Expenses', 'Net Income', 'Occupancy Rate', 'Average Rent']
        ];
        
        properties.forEach(property => {
            const tenants = property.tenants || [];
            const monthlyPayments = property.monthly || [];
            const expenses = property.expenses || [];
            
            const totalIncome = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const netIncome = totalIncome - totalExpenses;
            const occupancyRate = property.units > 0 ? ((tenants.length / property.units) * 100).toFixed(1) + '%' : '0%';
            const avgRent = tenants.length > 0 ? (tenants.reduce((sum, t) => sum + t.rent, 0) / tenants.length).toFixed(0) : 0;
            
            summaryData.push([
                property.name,
                totalIncome,
                totalExpenses,
                netIncome,
                occupancyRate,
                avgRent
            ]);
        });
        
        const summaryWS = worksheetFromArrayOfArrays(summaryData);
        workbook.SheetNames.push('Financial Summary');
        workbook.Sheets['Financial Summary'] = summaryWS;
    }
    
    // Generate Excel file
    if (typeof XLSX !== 'undefined') {
        const wbout = XLSX.write(workbook, {bookType: 'xlsx', type: 'binary'});
        const blob = new Blob([s2ab(wbout)], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inzu-comprehensive-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Excel file with multiple sheets exported successfully!');
    } else {
        showNotification('Excel library not loaded. Please try again.', 'error');
    }
}

// Helper function to convert array of arrays to worksheet format
function worksheetFromArrayOfArrays(data) {
    if (typeof XLSX === 'undefined') {
        throw new Error('XLSX library not loaded');
    }
    
    const ws = {};
    const range = {s: {c: 0, r: 0}, e: {c: 0, r: 0}};
    
    for (let R = 0; R !== data.length; ++R) {
        for (let C = 0; C !== data[R].length; ++C) {
            if (range.s.r > R) range.s.r = R;
            if (range.s.c > C) range.s.c = C;
            if (range.e.r < R) range.e.r = R;
            if (range.e.c < C) range.e.c = C;
            
            const cell = {v: data[R][C]};
            if (cell.v == null) continue;
            
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            ws[cellRef] = cell;
        }
    }
    
    if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
    ws['!cols'] = data[0].map(() => ({wch: 15}));
    return ws;
}

// Helper function to convert string to ArrayBuffer
function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}

function importData() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to import');
        return;
    }
    
    // Clear the file input so the same file can be selected again if needed
    fileInput.value = '';
    
    showNotification('Importing data...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Convert flat structure to hierarchical structure
            const hierarchicalData = {
                properties: [],
                selectedPropertyId: null
            };
            
            // Create a default property if none exists
            if (!importedData.properties || importedData.properties.length === 0) {
                hierarchicalData.properties.push({
                    id: Date.now(),
                    name: 'Imported Property',
                    address: 'Imported Address',
                    type: 'apartment',
                    units: 50,
                    description: 'Property created during import',
                    tenants: [],
                    monthly: [],
                    expenses: [],
                    moveOuts: [],
                    queries: [],
                    createdAt: new Date().toISOString()
                });
            }
            
            // Migrate flat data to hierarchical structure
            if (importedData.tenants && importedData.tenants.length > 0) {
                importedData.tenants.forEach(tenant => {
                    const targetProperty = hierarchicalData.properties[0]; // Use first property
                    if (targetProperty) {
                        targetProperty.tenants = targetProperty.tenants || [];
                        targetProperty.tenants.push(tenant);
                    }
                });
            }
            
            if (importedData.monthly && importedData.monthly.length > 0) {
                importedData.monthly.forEach(payment => {
                    const targetProperty = hierarchicalData.properties[0]; // Use first property
                    if (targetProperty) {
                        targetProperty.monthly = targetProperty.monthly || [];
                        targetProperty.monthly.push(payment);
                    }
                });
            }
            
            if (importedData.expenses && importedData.expenses.length > 0) {
                importedData.expenses.forEach(expense => {
                    const targetProperty = hierarchicalData.properties[0]; // Use first property
                    if (targetProperty) {
                        targetProperty.expenses = targetProperty.expenses || [];
                        targetProperty.expenses.push(expense);
                    }
                });
            }
            
            if (importedData.moveOuts && importedData.moveOuts.length > 0) {
                importedData.moveOuts.forEach(moveOut => {
                    const targetProperty = hierarchicalData.properties[0]; // Use first property
                    if (targetProperty) {
                        targetProperty.moveOuts = targetProperty.moveOuts || [];
                        targetProperty.moveOuts.push(moveOut);
                    }
                });
            }
            
            // Confirm import
            if (confirm('This will replace all current data. Are you sure?')) {
                data = hierarchicalData;
                saveData();
                renderAllEntries();
                updateTenantSelects();
                showNotification('Data imported successfully! ' + validData.tenants.length + ' tenants, ' + validData.monthly.length + ' payments loaded.');
                fileInput.value = ''; // Clear file input
            }
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Error: ' + error.message + '. Make sure you exported this from the Rental Manager app.');
        }
    };
    
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL data permanently. Are you sure?')) {
        if (confirm('Last chance! Export a backup first if needed. Delete everything?')) {
            data = {
                properties: [],
                selectedPropertyId: null
            };
            saveData();
            renderAllEntries();
            updateTenantSelects();
            showNotification('All data cleared');
        }
    }
}

// ===== EDIT FUNCTIONS =====
function captureTenantFormState() {
    const form = document.getElementById('tenantForm');
    tenantFormInitialState = JSON.stringify(
        Array.from(new FormData(form))
    );
    console.log('🔍 Captured initial form state:', tenantFormInitialState);
}

function updateTenantFormButtons() {
    const cancelBtn = document.getElementById('tenantCancelBtn');
    const saveBtn = document.querySelector('#tenantForm button[type="submit"]');
    
    // Cancel button is always enabled
    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = '1';
        cancelBtn.style.cursor = 'pointer';
    }
    
    // Update button only enabled when there are changes (both add and edit modes)
    if (saveBtn) {
        saveBtn.disabled = !hasTenantFormChanged;
        saveBtn.style.opacity = hasTenantFormChanged ? '1' : '0.5';
        saveBtn.style.cursor = hasTenantFormChanged ? 'pointer' : 'not-allowed';
    }
}

function captureMonthlyFormState() {
    // Use edit form if we're in edit mode, otherwise use regular form
    const form = document.getElementById('rentEditForm') || document.getElementById('rentForm');
    monthlyFormInitialState = JSON.stringify(
        Array.from(new FormData(form))
    );
}

function updateMonthlyFormButtons() {
    const cancelBtn = document.getElementById('rentCancelBtn');
    // Use edit form if it exists, otherwise use regular form
    const saveBtn = document.querySelector('#rentEditForm button[type="submit"]') || document.querySelector('#rentForm button[type="submit"]');
    
    // Cancel button is always enabled
    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = '1';
        cancelBtn.style.cursor = 'pointer';
    }
    
    // Update button only enabled when there are changes
    if (saveBtn) {
        saveBtn.disabled = !hasMonthlyFormChanged;
        saveBtn.style.opacity = hasMonthlyFormChanged ? '1' : '0.5';
        saveBtn.style.cursor = hasMonthlyFormChanged ? 'pointer' : 'not-allowed';
    }
}

function captureExpenseFormState() {
    // Try to find the active form (add or edit)
    const form = document.getElementById('expenseForm') || document.getElementById('expenseEditForm');
    if (form) {
        expenseFormInitialState = JSON.stringify(
            Array.from(new FormData(form))
        );
    }
}

function updateExpenseFormButtons() {
    const cancelBtn = document.getElementById('expenseCancelBtn');
    // Try to find both add and edit form buttons
    const saveBtn = document.querySelector('#expenseForm button[type="submit"]') || 
                   document.querySelector('#expenseEditForm button[type="submit"]');
    
    // Cancel button is always enabled
    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = '1';
        cancelBtn.style.cursor = 'pointer';
    }
    
    // Update button only enabled when there are changes
    if (saveBtn) {
        saveBtn.disabled = !hasExpenseFormChanged;
        saveBtn.style.opacity = hasExpenseFormChanged ? '1' : '0.5';
        saveBtn.style.cursor = hasExpenseFormChanged ? 'pointer' : 'not-allowed';
    }
}

function captureMoveOutFormState() {
    const form = document.getElementById('moveoutForm');
    moveOutFormInitialState = JSON.stringify(
        Array.from(new FormData(form))
    );
}

function updateMoveOutFormButtons() {
    const cancelBtn = document.getElementById('moveOutCancelBtn');
    const saveBtn = document.querySelector('#moveoutForm button[type="submit"]');
    
    // Cancel button is always enabled
    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = '1';
        cancelBtn.style.cursor = 'pointer';
    }
    
    // Update button only enabled when there are changes
    if (saveBtn) {
        saveBtn.disabled = !hasMoveOutFormChanged;
        saveBtn.style.opacity = hasMoveOutFormChanged ? '1' : '0.5';
        saveBtn.style.cursor = hasMoveOutFormChanged ? 'pointer' : 'not-allowed';
    }
}

function editTenant(id) {
    console.log('🔄 editTenant() called with id:', id);
    
    // Use safe helper to find tenant
    const result = findTenantInAllProperties(id);
    if (!result) {
        console.error('❌ Tenant not found:', id);
        showNotification('Tenant not found');
        return;
    }
    
    const { tenant, property } = result;
    console.log('✅ Found tenant:', tenant.name, 'in property:', property.name);
    
    // Store the original tenant data for validation and change detection
    window.editingTenantId = id;
    window.originalTenantData = {
        name: tenant.name,
        unit: tenant.unit,
        rent: tenant.rent,
        phone: tenant.phone || '',
        email: tenant.email || '',
        since: tenant.since || '',
        depositPaid: tenant.depositPaid || '',
        notes: tenant.notes || '',
        electricityMeter: tenant.electricityMeter || '',
        electricityBalance: tenant.electricityBalance || 0,
        waterMeter: tenant.waterMeter || '',
        waterBalance: tenant.waterBalance || 0,
        leaseDocuments: tenant.leaseDocuments || [],
        idDocuments: tenant.idDocuments || [],
        leaseDocument: tenant.leaseDocument || null,
        idDocument: tenant.idDocument || null
    };
    
    // Show overlay and lock background scroll
    document.getElementById('tenantEditOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Fill form with tenant data
    document.getElementById('tenantName').value = tenant.name;
    document.getElementById('tenantUnit').value = tenant.unit;
    document.getElementById('tenantRent').value = tenant.rent;
    document.getElementById('tenantPhone').value = tenant.phone || '';
    document.getElementById('tenantEmail').value = tenant.email || '';
    document.getElementById('tenantSince').value = tenant.tenantSince || '';
    document.getElementById('depositPaid').value = tenant.depositPaid || '';
    document.getElementById('tenantNotes').value = tenant.notes || '';
    document.getElementById('electricityMeter').value = tenant.electricityMeter || '';
    document.getElementById('electricityBalance').value = tenant.electricityBalance || '';
    document.getElementById('waterMeter').value = tenant.waterMeter || '';
    document.getElementById('waterBalance').value = tenant.waterBalance || '';
    
    // CRITICAL: Capture baseline immediately after form population
    hasTenantFormChanged = false;
    captureTenantFormState();
    updateTenantFormButtons();
    
    // Display existing documents
    const leaseDisplay = document.getElementById('leaseDocumentDisplay');
    const idDisplay = document.getElementById('tenantIdDocumentDisplay');
    
    // Show lease document if exists
    if (tenant.leaseDocuments && tenant.leaseDocuments.length > 0) {
        // Show individual lease files with X buttons
        let leaseFilesHtml = '<div>';
        tenant.leaseDocuments.forEach((doc, index) => {
            leaseFilesHtml += `
                <div>
                    <span>${doc.name}</span>
                    <button type="button" onclick="removeLeaseDocument(${index})">×</button>
                </div>
            `;
        });
        leaseFilesHtml += '</div>';
        leaseDisplay.innerHTML = leaseFilesHtml;
        
        // Create Upload button with correct state based on count
        let leaseBtnState = '';
        let leaseBtnText = 'Upload';
        if (tenant.leaseDocuments.length >= 3) {
            leaseBtnState = 'disabled style="opacity: 0.5; cursor: not-allowed;"';
            leaseBtnText = 'Max 3 files';
        }
        document.getElementById('leaseDocumentButtons').innerHTML = `<button type="button" id="leaseUploadBtn" class="btn btn-secondary" onclick="document.getElementById('leaseDocument').click()" ${leaseBtnState}>${leaseBtnText}</button>`;
    } else if (tenant.leaseDocument) {
        // Show single file with X button (backward compatibility)
        leaseDisplay.innerHTML = `
            <div>
                <span>${tenant.leaseDocument.name}</span>
                <button type="button" onclick="removeLeaseDocument(0)">×</button>
            </div>
        `;
        
        // Show Upload button (enabled for single file)
        document.getElementById('leaseDocumentButtons').innerHTML = '<button type="button" id="leaseUploadBtn" class="btn btn-secondary" onclick="document.getElementById(\'leaseDocument\').click()">Upload</button>';
    } else {
        leaseDisplay.innerHTML = '<span>No documents uploaded</span>';
        document.getElementById('leaseDocumentButtons').innerHTML = '<button type="button" id="leaseUploadBtn" class="btn btn-secondary" onclick="document.getElementById(\'leaseDocument\').click()">Upload</button>';
    }
    
    // Show ID documents if exist (handle both old single and new multiple format)
    const idButtonsContainer = document.getElementById('idDocumentButtons');
    if (tenant.idDocuments && tenant.idDocuments.length > 0) {
        // Show individual files with X buttons
        let filesHtml = '<div>';
        tenant.idDocuments.forEach((doc, index) => {
            filesHtml += `
                <div>
                    <span>${doc.name}</span>
                    <button type="button" onclick="removeIdDocument(${index})">×</button>
                </div>
            `;
        });
        filesHtml += '</div>';
        idDisplay.innerHTML = filesHtml;
        
        // Create Upload button with correct state based on count
        let idBtnState = '';
        let idBtnText = 'Upload';
        if (tenant.idDocuments.length >= 3) {
            idBtnState = 'disabled style="opacity: 0.5; cursor: not-allowed;"';
            idBtnText = 'Max 3 files';
        }
        idButtonsContainer.innerHTML = `<button type="button" id="idUploadBtn" class="btn btn-secondary" onclick="document.getElementById('tenantIdDocument').click()" ${idBtnState}>${idBtnText}</button>`;
        window.idDocumentMode = 'add'; // Always add mode when documents exist
    } else if (tenant.idDocument) {
        // Show single file with X button
        idDisplay.innerHTML = `
            <div>
                <span>${tenant.idDocument.name}</span>
                <button type="button" onclick="removeSingleIdDocument()">×</button>
            </div>
        `;
        
        // Show Upload button (enabled for single file)
        idButtonsContainer.innerHTML = '<button type="button" id="idUploadBtn" class="btn btn-secondary" onclick="document.getElementById(\'tenantIdDocument\').click()">Upload</button>';
        window.idDocumentMode = 'add'; // Always add mode when documents exist
    } else {
        idDisplay.innerHTML = '<span>No documents uploaded</span>';
        idButtonsContainer.innerHTML = '<button type="button" id="idUploadBtn" class="btn btn-secondary" onclick="document.getElementById(\'tenantIdDocument\').click()">Upload</button>';
        window.idDocumentMode = 'new'; // New upload mode
    }
    
    // Change save button text
    const saveBtn = document.querySelector('#tenantForm button[type="submit"]');
    saveBtn.textContent = 'Update Tenant';
    
    // Change form heading
    document.getElementById('tenantFormTitle').textContent = 'Edit Tenant';
    
    // Show cancel button
    document.getElementById('tenantCancelBtn').classList.remove('hidden');
    
    // 🔑 CRITICAL: Add file input event listeners for change detection
    const leaseFileInput = document.getElementById('leaseDocument');
    const idFileInput = document.getElementById('tenantIdDocument');
    
    if (leaseFileInput) {
        // Remove existing listeners to prevent duplicates
        leaseFileInput.replaceWith(leaseFileInput.cloneNode(true));
        const newLeaseInput = document.getElementById('leaseDocument');
        newLeaseInput.addEventListener('change', () => {
            console.log('🔍 Lease file input changed, files length:', newLeaseInput.files.length);
            hasTenantFormChanged = true;
            console.log('🔍 File upload change detected:', hasTenantFormChanged);
            
            // Display uploaded files immediately
            displayUploadedFiles('leaseDocumentDisplay', newLeaseInput.files);
            
            updateTenantFormButtons();
        });
    }
    
    if (idFileInput) {
        // Remove existing listeners to prevent duplicates
        idFileInput.replaceWith(idFileInput.cloneNode(true));
        const newIdInput = document.getElementById('tenantIdDocument');
        newIdInput.addEventListener('change', () => {
            console.log('🔍 ID file input changed, files length:', newIdInput.files.length);
            hasTenantFormChanged = true;
            console.log('🔍 File upload change detected:', hasTenantFormChanged);
            
            // Display uploaded files immediately
            displayUploadedFiles('tenantIdDocumentDisplay', newIdInput.files);
            
            updateTenantFormButtons();
        });
    }
    
    showNotification('Edit tenant details and save to update');
}

// Display uploaded files immediately
function displayUploadedFiles(displayElementId, files) {
    const displayElement = document.getElementById(displayElementId);
    if (!displayElement) return;
    
    if (files && files.length > 0) {
        let filesHtml = '<div>';
        for (let i = 0; i < files.length; i++) {
            filesHtml += `
                <div>
                    <span>${files[i].name}</span>
                    <button type="button" onclick="removeNewFile(${i})">×</button>
                </div>
            `;
        }
        filesHtml += '</div>';
        displayElement.innerHTML = filesHtml;
    } else {
        displayElement.innerHTML = '<span>No documents uploaded</span>';
    }
}

// Display existing tenant documents
function displayIdDocuments(tenant) {
    const idDisplay = document.getElementById('tenantIdDocumentDisplay');
    if (!idDisplay || !tenant) return;
    
    if (tenant.idDocuments && tenant.idDocuments.length > 0) {
        let filesHtml = '<div>';
        tenant.idDocuments.forEach((doc, index) => {
            filesHtml += `
                <div>
                    <span>${doc.name}</span>
                    <button type="button" onclick="removeIdDocument(${index})">×</button>
                </div>
            `;
        });
        filesHtml += '</div>';
        idDisplay.innerHTML = filesHtml;
    } else if (tenant.idDocument) {
        // Backward compatibility for single file
        idDisplay.innerHTML = `
            <div>
                <span>${tenant.idDocument.name}</span>
                <button type="button" onclick="removeSingleIdDocument()">×</button>
            </div>
        `;
    } else {
        idDisplay.innerHTML = '<span>No documents uploaded</span>';
    }
}

// Function to cancel tenant edit
function cancelTenantEdit() {
    if (window.editingTenantId) {
        // Check if there are unsaved changes
        const hasChanges = !document.querySelector('#tenantForm button[type="submit"]').disabled;
        
        if (hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }
        
        // Reset editing state
        window.editingTenantId = null;
        window.originalTenantData = null;
    }
    
    // Reset form
    document.getElementById('tenantForm').reset();
    
    // Reset form heading
    document.getElementById('tenantFormTitle').textContent = 'Add New Tenant';
    
    // Reset save button text and state
    const saveBtn = document.querySelector('#tenantForm button[type="submit"]');
    saveBtn.textContent = 'Save Tenant';
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
    
    // Hide cancel button
    document.getElementById('tenantCancelBtn').classList.add('hidden');
    
    // Reset document displays
    document.getElementById('leaseDocumentDisplay').innerHTML = '';
    document.getElementById('tenantIdDocumentDisplay').innerHTML = '';
    
    // Reset button states
    document.getElementById('leaseUploadBtn').textContent = 'Upload';
    
    // Reset ID document buttons
    document.getElementById('idDocumentButtons').innerHTML = '<button type="button" id="idUploadBtn" class="btn btn-secondary" onclick="document.getElementById(\'tenantIdDocument\').click()">Upload</button>';
    
    // Reset lease document buttons
    document.getElementById('leaseDocumentButtons').innerHTML = '<button type="button" id="leaseUploadBtn" class="btn btn-secondary" onclick="document.getElementById(\'leaseDocument\').click()">Upload</button>';
    
    // Clear accumulated files
    window.existingLeaseFiles = [];
    window.existingIdFiles = [];
    
    window.idDocumentMode = 'new';
    
    // Hide overlay and restore background scroll
    document.getElementById('tenantEditOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    
    showNotification('Edit cancelled');
}

function editMonthly(id) {
    console.log('🔄 editMonthly() called with id:', id);
    
    // Use safe helper to find payment in hierarchical structure
    let payment = null;
    let paymentProperty = null;
    
    for (const property of data.properties) {
        if (property.monthly) {
            const found = property.monthly.find(p => p.id === id);
            if (found) {
                payment = found;
                paymentProperty = property;
                break;
            }
        }
    }
    
    if (!payment) {
        console.error('❌ Payment not found:', id);
        showNotification('Payment not found');
        return;
    }
    
    console.log('✅ Found payment:', payment.amount, 'in property:', paymentProperty.name);
    console.log('🔍 About to show rentEditOverlay');
    
    // Show overlay and lock background scroll
    const overlay = document.getElementById('rentEditOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('✅ Overlay shown successfully');
    } else {
        console.error('❌ rentEditOverlay not found!');
        return;
    }
    
    // Fill form with payment data
    document.getElementById('rentTenantEdit').value = payment.tenantId;
    document.getElementById('rentAmountEdit').value = payment.amount;
    document.getElementById('rentDateEdit').value = payment.date;
    document.getElementById('rentNotesEdit').value = payment.notes || '';
    
    // 🔑 CRITICAL: Hide tenant dropdown in edit mode and show tenant name
    const tenantSelect = document.getElementById('rentTenantEdit');
    console.log('🔍 Looking for tenant with ID:', payment.tenantId);
    console.log('🔍 Available tenants in property:', paymentProperty.tenants);
    
    const tenant = paymentProperty.tenants?.find(t => t.id == payment.tenantId); // Use == instead of ===
    console.log('🔍 Found tenant:', tenant);
    
    if (tenant) {
        console.log('✅ Creating tenant display for:', tenant.name);
        
        // Hide the dropdown completely
        tenantSelect.style.display = 'none';
        
        // Hide the "Select Tenant" label
        const tenantLabel = document.querySelector('label[for="rentTenantEdit"]');
        if (tenantLabel) {
            tenantLabel.style.display = 'none';
        }
        
        // Show tenant name in place of the dropdown
        const tenantDisplay = document.createElement('div');
        tenantDisplay.id = 'rentTenantDisplay';
        tenantDisplay.style.marginBottom = '15px';
        tenantDisplay.style.padding = '12px';
        tenantDisplay.style.backgroundColor = '#e8f4fd';
        tenantDisplay.style.border = '1px solid #2196F3';
        tenantDisplay.style.borderRadius = '6px';
        tenantDisplay.innerHTML = `
            <div style="font-size: 14px; color: #666; margin-bottom: 4px;">Editing Payment For:</div>
            <div style="font-size: 16px; font-weight: bold; color: #1976D2;">${tenant.name}</div>
            <div style="font-size: 12px; color: #888; margin-top: 4px;">Unit: ${tenant.unit || 'N/A'}</div>
        `;
        
        // Insert the display before the dropdown
        tenantSelect.parentNode.insertBefore(tenantDisplay, tenantSelect);
        console.log('✅ Tenant display created and inserted');
    } else {
        console.error('❌ Tenant not found for payment.tenantId:', payment.tenantId);
    }
    
    // Reset edit state and capture baseline
    hasMonthlyFormChanged = false;
    captureMonthlyFormState();
    updateMonthlyFormButtons();
    
    // Change save button text
    const saveBtn = document.querySelector('#rentEditForm button[type="submit"]');
    saveBtn.textContent = 'Update Payment';
    
    // Change form heading
    document.getElementById('rentFormTitle').textContent = 'Edit Rent Payment';
    
    // Show cancel button
    document.getElementById('rentCancelBtn').classList.remove('hidden');
    
    showNotification('Edit payment details and save to update');
}

// Function to cancel monthly edit
function cancelMonthlyEdit() {
    console.log('🔄 cancelMonthlyEdit() called');
    console.log('🔍 window.editingMonthlyId:', window.editingMonthlyId);
    
    if (window.editingMonthlyId) {
        // Check if there are unsaved changes
        const submitBtn = document.querySelector('#monthlyEditForm button[type="submit"]');
        console.log('🔍 Submit button found:', !!submitBtn);
        console.log('🔍 Submit button disabled:', submitBtn?.disabled);
        
        const hasChanges = !submitBtn.disabled;
        console.log('🔍 hasChanges:', hasChanges);
        
        if (hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                console.log('❌ User cancelled the cancel');
                return;
            }
        }
        
        // Reset editing state
        window.editingMonthlyId = null;
        window.originalMonthlyData = null;
    }
    
    console.log('🔍 About to reset form');
    // Reset form
    const editForm = document.getElementById('rentEditForm');
    console.log('🔍 Edit form found:', !!editForm);
    if (editForm) {
        editForm.reset();
    }
    
    // 🔑 CRITICAL: Clean up tenant display and show dropdown again
    const tenantDisplay = document.getElementById('rentTenantDisplay');
    if (tenantDisplay) {
        tenantDisplay.remove();
    }
    
    const tenantSelect = document.getElementById('rentTenantEdit');
    tenantSelect.style.display = 'block';
    
    // Show "Select Tenant" label again
    const tenantLabel = document.querySelector('label[for="rentTenantEdit"]');
    if (tenantLabel) {
        tenantLabel.style.display = 'block';
    }
    
    // Reset form heading
    document.getElementById('rentFormTitle').textContent = 'Record Rent Payment';
    
    // Reset save button text and state
    const saveBtn = document.querySelector('#rentEditForm button[type="submit"]');
    saveBtn.textContent = 'Record Payment';
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
    
    // Hide cancel button
    document.getElementById('rentCancelBtn').classList.add('hidden');
    
    // Hide overlay and restore background scroll
    console.log('🔍 About to close overlay');
    const overlay = document.getElementById('rentEditOverlay');
    console.log('🔍 Overlay found:', !!overlay);
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
        console.log('✅ Overlay closed successfully');
    } else {
        console.error('❌ Overlay not found!');
    }
    
    showNotification('Edit cancelled');
    console.log('✅ cancelMonthlyEdit completed');
}

function editExpense(id) {
    console.log('🔄 editExpense() called with id:', id);
    
    // Use safe helper to find expense in hierarchical structure
    let expense = null;
    let expenseProperty = null;
    
    for (const property of data.properties) {
        if (property.expenses) {
            const found = property.expenses.find(e => e.id === id);
            if (found) {
                expense = found;
                expenseProperty = property;
                break;
            }
        }
    }
    
    if (!expense) {
        console.error('❌ Expense not found:', id);
        showNotification('Expense not found');
        return;
    }
    
    console.log('✅ Found expense:', expense.description, 'in property:', expenseProperty.name);
    
    // Store the original expense data for validation and change detection
    window.editingExpenseId = id;
    window.originalExpenseData = {
        category: expense.category,
        description: expense.description,
        reference: expense.reference || '',
        amount: expense.amount,
        date: expense.date
    };
    
    // Show overlay and lock background scroll
    document.getElementById('expenseEditOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Fill form with expense data
    document.getElementById('expenseCategoryEdit').value = expense.category;
    document.getElementById('expenseDescriptionEdit').value = expense.description;
    document.getElementById('expenseReferenceEdit').value = expense.reference || '';
    document.getElementById('expenseAmountEdit').value = expense.amount;
    document.getElementById('expenseDateEdit').value = expense.date;
    
    // Reset edit state and capture baseline
    hasExpenseFormChanged = false;
    captureExpenseFormState();
    updateExpenseFormButtons();
    
    // Change save button text
    const saveBtn = document.querySelector('#expenseEditForm button[type="submit"]');
    saveBtn.textContent = 'Update Expense';
    
    // Change form heading
    document.getElementById('expenseFormTitle').textContent = 'Edit Expense';
    
    // Show cancel button
    document.getElementById('expenseCancelBtn').classList.remove('hidden');
    
    showNotification('Edit expense details and save to update');
}

// Function to cancel expense edit
function cancelExpenseEdit() {
    if (window.editingExpenseId) {
        // Check if there are unsaved changes - look for edit form button
        const hasChanges = !document.querySelector('#expenseEditForm button[type="submit"]').disabled;
        
        if (hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }
        
        // Reset editing state
        window.editingExpenseId = null;
        window.originalExpenseData = null;
    }
    
    // Reset form
    document.getElementById('expenseForm').reset();
    
    // Reset form heading
    document.getElementById('expenseFormTitle').textContent = 'Add Expense';
    
    // Reset save button text and state
    const saveBtn = document.querySelector('#expenseForm button[type="submit"]');
    saveBtn.textContent = 'Add Expense';
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
    
    // Hide cancel button
    document.getElementById('expenseCancelBtn').classList.add('hidden');
    
    // Hide overlay and restore background scroll
    document.getElementById('expenseEditOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    
    // Navigate to expense tab instead of home
    showTab('expenses');
    
    showNotification('Edit cancelled');
}

function editMoveOut(id) {
    console.log('🔄 editMoveOut() called with id:', id);
    
    // Use safe helper to find move out in hierarchical structure
    let moveOut = null;
    let moveOutProperty = null;
    
    for (const property of data.properties) {
        if (property.moveOuts) {
            const found = property.moveOuts.find(m => m.id === id);
            if (found) {
                moveOut = found;
                moveOutProperty = property;
                break;
            }
        }
    }
    
    if (!moveOut) {
        console.error('❌ Move out not found:', id);
        showNotification('Move out record not found');
        return;
    }
    
    console.log('✅ Found move out for tenant:', moveOut.tenantName, 'in property:', moveOutProperty.name);
    
    // Store the original move out data for validation and change detection
    window.editingMoveOutId = id;
    window.originalMoveOutData = {
        tenantId: moveOut.tenantId,
        date: moveOut.date,
        depositAdjustment: moveOut.depositAdjustment || '',
        notes: moveOut.notes || ''
    };
    
    // Show overlay and lock background scroll
    document.getElementById('moveOutEditOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Fill form with move out data
    document.getElementById('moveoutTenantEdit').value = moveOut.tenantId;
    document.getElementById('moveoutDateEdit').value = moveOut.date;
    document.getElementById('depositReturnedEdit').value = moveOut.depositAdjustment || '';
    document.getElementById('moveoutNotesEdit').value = moveOut.notes || '';
    
    // Reset edit state and capture baseline
    hasMoveOutFormChanged = false;
    captureMoveOutFormState();
    updateMoveOutFormButtons();
    
    // Change save button text
    const saveBtn = document.querySelector('#moveoutEditForm button[type="submit"]');
    saveBtn.textContent = 'Update Move Out';
    
    // Change form heading
    document.getElementById('moveOutFormTitle').textContent = 'Edit Move Out';
    
    // Show cancel button
    document.getElementById('moveOutCancelBtn').classList.remove('hidden');
    
    showNotification('Edit move out details and save to update');
}

// Function to cancel move out edit
function cancelMoveOutEdit() {
    if (window.editingMoveOutId) {
        // Check if there are unsaved changes
        const hasChanges = !document.querySelector('#moveoutForm button[type="submit"]').disabled;
        
        if (hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }
        
        // Reset editing state
        window.editingMoveOutId = null;
        window.originalMoveOutData = null;
    }
    
    // Reset form
    document.getElementById('moveoutForm').reset();
    
    // Reset form heading
    document.getElementById('moveOutFormTitle').textContent = 'Record Move Out';
    
    // Reset save button text and state
    const saveBtn = document.querySelector('#moveoutForm button[type="submit"]');
    saveBtn.textContent = 'Record Move Out';
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
    
    // Hide cancel button
    document.getElementById('moveOutCancelBtn').classList.add('hidden');
    
    // Hide overlay and restore background scroll
    document.getElementById('moveOutEditOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    
    showNotification('Edit cancelled');
}

// ===== QUERY FUNCTIONS =====
function populateQueryTenantDropdown() {
    const tenantSelect = document.getElementById('queryTenant');
    if (!tenantSelect) return;
    
    // Clear existing options except the first placeholder
    tenantSelect.innerHTML = '<option value="">Select tenant...</option>';
    
    if (!data.selectedPropertyId) {
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        return;
    }
    
    const propertyTenants = selectedProperty.tenants || [];
    
    // Add general option first
    const generalOption = document.createElement('option');
    generalOption.value = 'general';
    generalOption.textContent = 'General (not tenant-specific)';
    tenantSelect.appendChild(generalOption);
    
    // Add tenant options
    propertyTenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant.id;
        option.textContent = `${tenant.name} - Unit ${tenant.unit}`;
        tenantSelect.appendChild(option);
    });
    
    if (tenantSelect.options.length === 1) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No tenants available";
        option.disabled = true;
        tenantSelect.appendChild(option);
    }
}

function addQuery() {
    // Validate that a property is selected
    if (!data.selectedPropertyId) {
        showNotification('Please select a property first!');
        return;
    }
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    if (!selectedProperty) {
        showNotification('Selected property not found!');
        return;
    }
    
    // Ensure property queries array exists
    if (!selectedProperty.queries) selectedProperty.queries = [];
    const tenantId = document.getElementById('queryTenant').value;
    const date = document.getElementById('queryDate').value || new Date().toISOString().split('T')[0];
    const issue = document.getElementById('queryIssue').value || '';
    const action = document.getElementById('queryAction').value || '';
    const resolved = document.getElementById('queryResolved').value === 'true';

    if (!tenantId) {
        showNotification('Please select a tenant for the query');
        return;
    }

    const q = {
        id: window.editingQueryId || Date.now(),
        tenantId: tenantId,
        date: date,
        issue: issue,
        action: action,
        resolved: resolved,
        createdAt: new Date().toISOString()
    };

    if (window.editingQueryId) {
        // Update existing query
        const index = selectedProperty.queries.findIndex(query => query.id === window.editingQueryId);
        if (index !== -1) {
            selectedProperty.queries[index] = q;
            showNotification('Query updated successfully!');
        }
        window.editingQueryId = null;
    } else {
        // Add new query to selected property
        selectedProperty.queries.push(q);
        showNotification('Query logged');
    }

    saveData();
    renderQueries();
    
    // Reset form and button state
    document.getElementById('queryForm').reset();
    
    const saveBtn = document.querySelector('#queryForm button[type="submit"]');
    if (saveBtn) {
        saveBtn.textContent = 'Add Query';
    }
    
    // Remove cancel button
    const cancelBtn = document.getElementById('queryCancelBtn');
    if (cancelBtn) {
        cancelBtn.remove();
    }
}

function renderQueries() {
    const container = document.getElementById('queriesList');
    if (!container) return;
    
    // Populate tenant dropdown first
    populateQueryTenantDropdown();
    
    // Get queries from selected property
    let queries = [];
    let propertyTenants = [];
    
    if (data.selectedPropertyId) {
        const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
        if (selectedProperty) {
            queries = selectedProperty.queries || [];
            propertyTenants = selectedProperty.tenants || [];
        }
    }
    
    if (!queries || queries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">No queries yet</div>
                <div class="empty-state-subtext">Tenant queries will appear here</div>
            </div>
        `;
        return;
    }

    const tenantsById = propertyTenants.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

    container.innerHTML = queries.slice().reverse().map(q => `
        <div class="entry-card query-card">
            <div class="query-header">
                <div class="query-tenant">${q.tenantId === 'general' ? 'General (not tenant-specific)' : (tenantsById[q.tenantId] ? tenantsById[q.tenantId].name + (tenantsById[q.tenantId].unit ? ' — ' + tenantsById[q.tenantId].unit : '') : 'Unknown Tenant')}</div>
                <div class="query-actions">
                    <div class="query-date">${new Date(q.date).toLocaleDateString()}</div>
                    <button class="btn btn-small ${q.resolved ? 'btn-success' : 'btn-secondary'}" onclick="toggleQueryResolved(${q.id})">${q.resolved ? 'Resolved' : 'Mark Resolved'}</button>
                    <button class="btn btn-small btn-secondary" onclick="editQuery(${q.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteQuery(${q.id})">Delete</button>
                </div>
            </div>
            <div class="query-details">
                <div>Issue: ${q.issue || '—'}</div>
                <div>Action: ${q.action || '—'}</div>
            </div>
        </div>
    `).join('');
}

function toggleQueryResolved(id) {
    // Find and toggle query in hierarchical structure
    for (const property of data.properties) {
        if (property.queries) {
            const query = property.queries.find(q => q.id === id);
            if (query) {
                query.resolved = !query.resolved;
                saveData();
                renderQueries();
                showNotification(query.resolved ? 'Query marked resolved' : 'Query marked unresolved');
                return;
            }
        }
    }
    showNotification('Query not found');
}

function deleteQuery(id) {
    if (!confirm('Delete this query?')) return;
    
    // Find and delete query in hierarchical structure
    let deleted = false;
    for (const property of data.properties) {
        if (property.queries) {
            const index = property.queries.findIndex(q => q.id === id);
            if (index !== -1) {
                property.queries.splice(index, 1);
                deleted = true;
                break;
            }
        }
    }
    
    if (deleted) {
        saveData();
        renderQueries();
        showToast('Query deleted', 'success');
    } else {
        showNotification('Query not found');
    }
}

function editQuery(id) {
    console.log('🔄 editQuery() called with id:', id);
    
    // Use safe helper to find query in hierarchical structure
    let query = null;
    let queryProperty = null;
    
    for (const property of data.properties) {
        if (property.queries) {
            const found = property.queries.find(q => q.id === id);
            if (found) {
                query = found;
                queryProperty = property;
                break;
            }
        }
    }
    
    if (!query) {
        console.error('❌ Query not found:', id);
        showNotification('Query not found');
        return;
    }
    
    console.log('✅ Found query:', query.subject, 'in property:', queryProperty.name);
    
    // Fill form with query data
    document.getElementById('queryTenant').value = query.tenantId || '';
    document.getElementById('queryDate').value = query.date || '';
    document.getElementById('queryIssue').value = query.issue || '';
    document.getElementById('queryAction').value = query.action || '';
    document.getElementById('queryResolved').value = query.resolved ? 'true' : 'false';
    
    // Store the query ID for update
    window.editingQueryId = id;
    
    // Change save button text
    const saveBtn = document.querySelector('#queryForm button[type="submit"]');
    if (saveBtn) {
        saveBtn.textContent = 'Update Query';
    }
    
    // Add cancel button if it doesn't exist
    let cancelBtn = document.getElementById('queryCancelBtn');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'queryCancelBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = cancelQueryEdit;
        
        const formActions = document.querySelector('#queryForm .form-actions');
        if (formActions) {
            formActions.insertBefore(cancelBtn, formActions.firstChild);
        }
    }
    
    // Scroll to form
    document.getElementById('queryForm').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('Edit query details and save to update');
}

function cancelQueryEdit() {
    // Reset form
    document.getElementById('queryForm').reset();
    
    // Reset save button text
    const saveBtn = document.querySelector('#queryForm button[type="submit"]');
    if (saveBtn) {
        saveBtn.textContent = 'Add Query';
    }
    
    // Remove cancel button
    const cancelBtn = document.getElementById('queryCancelBtn');
    if (cancelBtn) {
        cancelBtn.remove();
    }
    
    // Clear editing state
    window.editingQueryId = null;
    
    showNotification('Edit cancelled');
}

// ===== USER MENU FUNCTIONS =====
function toggleUserMenu() {
    const slideout = document.querySelector('.user-slideout');
    const overlay = document.querySelector('.slideout-overlay');
    slideout.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('sidebar-open');
    updateSlideoutUserInfo();
}

function closeUserMenu() {
    const slideout = document.querySelector('.user-slideout');
    const overlay = document.querySelector('.slideout-overlay');
    slideout.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

function showBackupSection() {
    // Switch to backup tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    const backupTab = document.querySelector('[onclick*="backup"]');
    const backupContent = document.getElementById('backup');
    
    if (backupTab) backupTab.classList.add('active');
    if (backupContent) backupContent.classList.add('active');
}

function updateSlideoutUserInfo() {
    const userNameElement = document.getElementById('slideoutUserName');
    const userEmailElement = document.getElementById('slideoutUserEmail');
    
    if (currentUser && userNameElement && userEmailElement) {
        userNameElement.textContent = currentUser.displayName || 'User';
        userEmailElement.textContent = currentUser.email || 'user@example.com';
    }
}

// ===== SPLASH SCREEN FUNCTIONS =====
function hideSplash() {
    console.log('🎯 hideSplash called, currentUser:', currentUser);
    const splashContainer = document.getElementById('splashContainer');
    if (splashContainer) {
        console.log('🎯 Adding hidden class to splash container');
        splashContainer.classList.add('hidden');
        setTimeout(() => {
            splashContainer.style.display = 'none';
        }, 500);
        
        // Show auth container if user is not authenticated
        if (!currentUser) {
            console.log('🎯 Showing auth container');
            document.getElementById('authContainer').style.display = 'flex';
        } else {
            console.log('🎯 User is authenticated, showing app content');
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('appContent').style.display = 'block';
        }
    } else {
        console.error('🎯 Splash container not found!');
    }
}

// ===== DOCUMENT MANAGEMENT FUNCTIONS =====
function removeIdDocument(index) {
    // Find the tenant being edited in hierarchical structure
    let editingTenant = null;
    for (const property of data.properties) {
        if (property.tenants) {
            const found = property.tenants.find(t => t.id === window.editingTenantId);
            if (found) {
                editingTenant = found;
                break;
            }
        }
    }
    
    if (editingTenant && editingTenant.idDocuments) {
        editingTenant.idDocuments.splice(index, 1);
        
        // Update change state
        hasTenantFormChanged = true;
        updateTenantFormButtons();
        
        // Refresh the display without re-populating the form
        displayIdDocuments(editingTenant);
        
        showNotification('Document removed. Save tenant to apply changes.');
    }
}

function removeSingleIdDocument() {
    // Find the tenant being edited in hierarchical structure
    let editingTenant = null;
    for (const property of data.properties) {
        if (property.tenants) {
            const found = property.tenants.find(t => t.id === window.editingTenantId);
            if (found) {
                editingTenant = found;
                break;
            }
        }
    }
    
    if (editingTenant) {
        editingTenant.idDocument = null;
        editingTenant.idDocuments = [];
        
        // Update change state
        hasTenantFormChanged = true;
        updateTenantFormButtons();
        
        // Refresh the display without re-populating the form
        displayIdDocuments(editingTenant);
        
        showNotification('Document removed. Save tenant to apply changes.');
    }
}

function removeNewFile(index) {
    console.log('removeNewFile called with index:', index);
    if (!confirm('Are you sure you want to remove this file?')) {
        return;
    }
    
    const fileInput = document.getElementById('tenantIdDocument');
    const dt = new DataTransfer();
    
    // Add all files except the one being removed
    const currentFiles = Array.from(fileInput.files);
    console.log('Current files before removal:', currentFiles.length);
    for (let i = 0; i < currentFiles.length; i++) {
        if (i !== index) {
            dt.items.add(currentFiles[i]);
        }
    }
    
    // Update the file input
    fileInput.files = dt.files;
    
    // Update the stored files array
    window.existingIdFiles = Array.from(dt.files);
    console.log('Files after removal:', dt.files.length);
    
    // Update display directly
    if (dt.files.length === 0) {
        document.getElementById('tenantIdDocumentDisplay').innerHTML = '';
    } else {
        let filesHtml = '<div>';
        for (let i = 0; i < dt.files.length; i++) {
            filesHtml += `
                <div>
                    <span>${dt.files[i].name}</span>
                    <button type="button" onclick="removeNewFile(${i})">×</button>
                </div>
            `;
        }
        filesHtml += '</div>';
        document.getElementById('tenantIdDocumentDisplay').innerHTML = filesHtml;
    }
    
    // Update upload button state
    const uploadBtn = document.getElementById('idUploadBtn');
    if (dt.files.length < 3) {
        uploadBtn.disabled = false;
        uploadBtn.style.opacity = '1';
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.textContent = 'Upload';
    }
    
    // Update change state
    if (window.editingTenantId) {
        hasTenantFormChanged = true;
        updateTenantFormButtons();
    }
}

function removeNewLeaseFile(index) {
    console.log('removeNewLeaseFile called with index:', index);
    if (!confirm('Are you sure you want to remove this file?')) {
        return;
    }
    
    const fileInput = document.getElementById('leaseDocument');
    const dt = new DataTransfer();
    
    // Add all files except the one being removed
    const currentFiles = Array.from(fileInput.files);
    console.log('Current lease files before removal:', currentFiles.length);
    for (let i = 0; i < currentFiles.length; i++) {
        if (i !== index) {
            dt.items.add(currentFiles[i]);
        }
    }
    
    // Update the file input
    fileInput.files = dt.files;
    
    // Update the stored files array
    window.existingLeaseFiles = Array.from(dt.files);
    console.log('Lease files after removal:', dt.files.length);
    
    // Update display directly
    if (dt.files.length === 0) {
        document.getElementById('leaseDocumentDisplay').innerHTML = '';
    } else {
        let filesHtml = '<div>';
        for (let i = 0; i < dt.files.length; i++) {
            filesHtml += `
                <div>
                    <span>${dt.files[i].name}</span>
                    <button type="button" onclick="removeNewLeaseFile(${i})">×</button>
                </div>
            `;
        }
        filesHtml += '</div>';
        document.getElementById('leaseDocumentDisplay').innerHTML = filesHtml;
    }
    
    // Update upload button state
    const uploadBtn = document.getElementById('leaseUploadBtn');
    if (dt.files.length < 3) {
        uploadBtn.disabled = false;
        uploadBtn.style.opacity = '1';
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.textContent = 'Upload';
    }
    
    // Update change state
    if (window.editingTenantId) {
        hasTenantFormChanged = true;
        updateTenantFormButtons();
    }
}

function removeLeaseDocument(index) {
    // Find the tenant being edited in hierarchical structure
    let editingTenant = null;
    for (const property of data.properties) {
        if (property.tenants) {
            const found = property.tenants.find(t => t.id === window.editingTenantId);
            if (found) {
                editingTenant = found;
                break;
            }
        }
    }
    
    if (editingTenant && editingTenant.leaseDocuments) {
        editingTenant.leaseDocuments.splice(index, 1);
        
        // Update change state
        hasTenantFormChanged = true;
        updateTenantFormButtons();
        
        // Refresh the display without re-populating the form
        const leaseDisplay = document.getElementById('leaseDocumentDisplay');
        if (editingTenant.leaseDocuments.length > 0) {
            let leaseFilesHtml = '<div>';
            editingTenant.leaseDocuments.forEach((doc, idx) => {
                leaseFilesHtml += `
                    <div>
                        <span>${doc.name}</span>
                        <button type="button" onclick="removeLeaseDocument(${idx})">×</button>
                    </div>
                `;
            });
            leaseFilesHtml += '</div>';
            leaseDisplay.innerHTML = leaseFilesHtml;
        } else {
            leaseDisplay.innerHTML = '<span>No documents uploaded</span>';
        }
        
        // Update upload button state
        const uploadBtn = document.getElementById('leaseUploadBtn');
        if (tenant.leaseDocuments.length < 3) {
            uploadBtn.disabled = false;
            uploadBtn.style.opacity = '1';
            uploadBtn.style.cursor = 'pointer';
            uploadBtn.textContent = 'Upload';
        }
        
        showNotification('Lease document removed. Save tenant to apply changes.');
    }
}

// Process ID documents for different modes
function processIdDocuments(existingIdDocuments, existingIdDocument, newFiles) {
    if (window.idDocumentMode === 'add') {
        // Add more mode: keep existing and add new
        const combined = existingIdDocuments ? [...existingIdDocuments] : [];
        if (existingIdDocument && !existingIdDocuments) {
            // Convert old single format to array
            combined.push(existingIdDocument);
        }
        
        // Add new files
        for (let file of newFiles) {
            combined.push({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            });
        }
        return combined;
    } else {
        // Replace mode: replace all with new files
        const result = [];
        for (let file of newFiles) {
            result.push({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            });
        }
        return result;
    }
}

// ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
window.showTab = showTab;
window.deleteTenant = deleteTenant;
window.archiveTenant = archiveTenant;
window.deleteMonthly = deleteMonthly;
window.deleteExpense = deleteExpense;
window.deleteMoveOut = deleteMoveOut;
window.removeLeaseDocument = removeLeaseDocument;
window.removeIdDocument = removeIdDocument;
window.removeSingleIdDocument = removeSingleIdDocument;
window.removeNewFile = removeNewFile;
window.removeNewLeaseFile = removeNewLeaseFile;
window.installApp = window.installApp;
window.captureSummaryScreenshot = captureSummaryScreenshot;
window.showArchiveModal = showArchiveModal;
window.closeArchiveModal = closeArchiveModal;
window.confirmArchiveTenant = confirmArchiveTenant;

// ===== ARCHIVE TENANT FUNCTIONS =====
function showArchiveModal(tenantId) {
    const property = data.properties.find(p => p.id == data.selectedPropertyId);
    const tenant = property.tenants.find(t => t.id == tenantId);
    
    if (!tenant) {
        showNotification('Tenant not found', 'error');
        return;
    }
    
    // Populate tenant summary
    const summaryDiv = document.getElementById('archiveTenantSummary');
    summaryDiv.innerHTML = `
        <h4>${tenant.name}</h4>
        <p><strong>Unit:</strong> ${tenant.unit}</p>
        <p><strong>Monthly Rent:</strong> Ksh ${tenant.rent}</p>
        <p><strong>Phone:</strong> ${tenant.phone || 'N/A'}</p>
        <p><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
        <p><strong>Tenant Since:</strong> ${tenant.tenantSince || 'N/A'}</p>
    `;
    
    // Set today's date as default
    document.getElementById('archiveTenantEnd').value = new Date().toISOString().split('T')[0];
    
    // Show modal
    const modal = document.getElementById('archiveTenantModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    document.body.style.overflow = 'hidden';
    
    // Store tenant ID for later use
    window.currentArchiveTenantId = tenantId;
}

function closeArchiveModal() {
    document.getElementById('archiveTenantModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    window.currentArchiveTenantId = null;
}

function confirmArchiveTenant() {
    const tenantEnd = document.getElementById('archiveTenantEnd').value;
    const finalBillAmount = document.getElementById('archiveFinalBillAmount').value;
    const depositAdjustment = document.getElementById('archiveDepositReturned').value;
    const finalElectricityReading = document.getElementById('archiveFinalElectricityReading').value;
    const finalWaterReading = document.getElementById('archiveFinalWaterReading').value;
    
    // Validation
    if (!tenantEnd) {
        showNotification('Please enter the date tenant left', 'error');
        return;
    }
    
    const property = data.properties.find(p => p.id == data.selectedPropertyId);
    const tenant = property.tenants.find(t => t.id == window.currentArchiveTenantId);
    
    // Update tenant with archive data
    tenant.tenantEnd = tenantEnd;
    tenant.finalBillAmount = Number(finalBillAmount) || null;
    tenant.depositAdjustment = Number(depositReturned) || null;
    tenant.finalElectricityReading = Number(finalElectricityReading) || null;
    tenant.finalWaterReading = Number(finalWaterReading) || null;
    tenant.archived = true;
    tenant.tenantEnd = tenantEnd;
    
    // Save fully (localStorage + Firebase) so occupancy updates everywhere
    saveData();
    
    // Close modal
    closeArchiveModal();
    
    // Refresh tenant list, property cards, and unit dropdown
    renderTenants();
    renderProperties();
    updateTenantSelects();
    
    showNotification('Tenant archived successfully!', 'success');
}

// Capture screenshot of summary page
function captureSummaryScreenshot() {
    // Use html2canvas to capture the summary section
    const summaryElement = document.getElementById('summary');
    
    if (!summaryElement) {
        showNotification('Summary section not found', 'error');
        return;
    }
    
    // Show loading notification
    showNotification('Capturing screenshot...');
    
    // Temporarily hide any off-screen elements and ensure clean capture
    const originalStyle = summaryElement.style.cssText;
    
    // Ensure the element is fully visible and properly positioned
    summaryElement.style.position = 'relative';
    summaryElement.style.left = '0';
    summaryElement.style.top = '0';
    summaryElement.style.width = 'auto';
    summaryElement.style.height = 'auto';
    summaryElement.style.overflow = 'visible';
    summaryElement.style.transform = 'none';
    
    // Use html2canvas if available
    if (typeof html2canvas !== 'undefined') {
        html2canvas(summaryElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            // Convert canvas to blob and download
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `summary-report-${new Date().toISOString().split('T')[0]}.png`;
                link.click();
                URL.revokeObjectURL(url);
                
                showNotification('Screenshot saved successfully!');
            }, 'image/png', 1.0); // Use quality 1.0 for better image
        }).catch(error => {
            console.error('Screenshot error:', error);
            showNotification('Failed to capture screenshot', 'error');
        }).finally(() => {
            // Restore original styling
            summaryElement.style.cssText = originalStyle;
        });
    } else {
        // Restore original styling before fallback
        summaryElement.style.cssText = originalStyle;
        
        // Fallback: try to use browser's screenshot API if available
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ 
                preferCurrentTab: true,
                video: { mediaSource: 'screen' }
            }).then(stream => {
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();
                
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    canvas.toBlob(function(blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `summary-report-${new Date().toISOString().split('T')[0]}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                        
                        stream.getTracks().forEach(track => track.stop());
                        showNotification('Screenshot saved successfully!');
                    }, 'image/png');
                }, 1000);
            }).catch(error => {
                console.error('Screen capture error:', error);
                showNotification('Screen capture not available', 'error');
            });
        } else {
            showNotification('Screenshot functionality not available in this browser', 'error');
        }
    }
}
window.exportData = exportData;
window.exportCSV = exportCSV;
window.exportExcel = exportExcel;
window.showExportDialog = showExportDialog;
window.closeExportDialog = closeExportDialog;
window.generateExport = generateExport;
window.selectProperty = selectProperty;
window.showPropertyExportDialog = showPropertyExportDialog;
window.closePropertyExportDialog = closePropertyExportDialog;
window.exportTenantOnly = exportTenantOnly;
window.exportPropertyFull = exportPropertyFull;
window.exportPropertyScreenshot = exportPropertyScreenshot;
window.clearAllData = clearAllData;
window.editTenant = editTenant;
window.editMonthly = editMonthly;
window.editExpense = editExpense;
window.editMoveOut = editMoveOut;
window.cancelMonthlyEdit = cancelMonthlyEdit;
window.cancelExpenseEdit = cancelExpenseEdit;
window.cancelMoveOutEdit = cancelMoveOutEdit;
window.loginWithGoogle = loginWithGoogle;
window.logoutUser = logoutUser;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu = closeUserMenu;
window.showBackupSection = showBackupSection;
window.editProperty = editProperty;
window.deleteProperty = deleteProperty;
window.cancelPropertyEdit = cancelPropertyEdit;
window.checkPropertyFormChanges = checkPropertyFormChanges;
window.updateProperty = updateProperty;
window.backToProperties = backToProperties;
window.toggleTenantForm = toggleTenantForm;
window.toggleMonthlyForm = toggleMonthlyForm;
window.toggleRentForm = toggleRentForm;
window.hideSplash = hideSplash;
window.showTab = showTab;
window.updatePropertyHeaders = updatePropertyHeaders;
window.toggleExpenseForm = toggleExpenseForm;
window.handlePropertySelection = handlePropertySelection;
window.switchExportTab = switchExportTab;
window.exportTenantStatement = exportTenantStatement;
window.exportTenantStatementImage = exportTenantStatementImage;
window.showUpdatePrompt = showUpdatePrompt;
window.dismissUpdate = dismissUpdate;
window.toggleAutoUpdate = toggleAutoUpdate;
window.applyUpdate = applyUpdate;
window.addNewTenant = addNewTenant;
window.showAddPropertyForm = showAddPropertyForm;
window.hideAddPropertyForm = hideAddPropertyForm;

// Shared Text Functionality
let sharedTextData = null;

// Parse URL parameters for shared text and images
function handleSharedText() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('shared_text');
    const sharedTitle = urlParams.get('shared_title');
    const sharedImage = urlParams.get('shared_image');
    
    if (sharedText) {
        sharedTextData = {
            text: sharedText,
            title: sharedTitle || 'Shared Text',
            type: 'text'
        };
        
        // Show dialog after a short delay to ensure app is loaded
        setTimeout(() => {
            showSharedTextDialog();
        }, 1000);
    } else if (sharedImage) {
        sharedTextData = {
            text: sharedImage,
            title: sharedTitle || 'Shared Image',
            type: 'image'
        };
        
        // Show dialog after a short delay to ensure app is loaded
        setTimeout(() => {
            showSharedTextDialog();
        }, 1000);
    }
}

function showSharedTextDialog() {
    if (!sharedTextData) return;
    
    const dialog = document.getElementById('sharedTextDialog');
    const preview = document.getElementById('sharedTextPreview');
    const title = document.getElementById('sharedDialogTitle');
    
    if (dialog && preview && title) {
        if (sharedTextData.type === 'image') {
            // Set title for images
            title.textContent = 'Add Shared Image';
            
            // For images, show a preview and note about OCR
            preview.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <strong>📷 Shared Image</strong>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <img src="${sharedTextData.text}" style="max-width: 100%; max-height: 200px; border-radius: 4px;" />
                </div>
                <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; font-size: 0.9rem;">
                    <strong>⚠️ Image Processing</strong><br>
                    Images require manual text entry. Please view the image and enter the payment details manually.
                </div>
            `;
        } else {
            // Set title for text
            title.textContent = 'Add Shared Text';
            
            // For text, show the text content
            preview.textContent = sharedTextData.text;
        }
        dialog.style.display = 'flex';
    }
}

function closeSharedTextDialog() {
    const dialog = document.getElementById('sharedTextDialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
    
    // Clear shared text data and URL params
    sharedTextData = null;
    const url = new URL(window.location);
    url.searchParams.delete('shared_text');
    url.searchParams.delete('shared_title');
    window.history.replaceState({}, document.title, url);
}

function parseSharedText(text) {
    // Try to extract amount from the text
    const amountRegex = /(?:Ksh|KES|₵|ksh|kes)?\s*[\d,]+(?:\.\d{2})?/gi;
    const amountMatches = text.match(amountRegex);
    
    let amount = '';
    if (amountMatches && amountMatches.length > 0) {
        // Clean the amount (remove non-numeric characters except decimal point)
        amount = amountMatches[0].replace(/[^\d.]/g, '');
    }
    
    // Try to extract date
    const dateRegex = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/gi;
    const dateMatches = text.match(dateRegex);
    
    let date = '';
    if (dateMatches && dateMatches.length > 0) {
        date = dateMatches[0];
    }
    
    // Extract any remaining text as notes
    let notes = text;
    if (amount) {
        notes = notes.replace(amountRegex, '');
    }
    if (date) {
        notes = notes.replace(dateRegex, '');
    }
    notes = notes.trim();
    
    return {
        amount: amount,
        date: date,
        notes: notes || 'From shared text'
    };
}

function addSharedTextToRent() {
    if (!sharedTextData) return;
    
    // Switch to rent tab
    showTab('monthly');
    
    // Open the rent form
    setTimeout(() => {
        toggleRentForm();
        
        // Only pre-fill if it's text, not image
        if (sharedTextData.type === 'text') {
            const parsed = parseSharedText(sharedTextData.text);
            
            // Fill form with parsed data
            setTimeout(() => {
                if (parsed.amount) {
                    const amountField = document.getElementById('rentAmount');
                    if (amountField) {
                        amountField.value = parsed.amount;
                    }
                }
                
                if (parsed.date) {
                    const dateField = document.getElementById('rentDate');
                    if (dateField) {
                        dateField.value = parsed.date;
                    }
                }
                
                if (parsed.notes) {
                    const notesField = document.getElementById('rentNotes');
                    if (notesField) {
                        notesField.value = parsed.notes;
                    }
                }
            }, 300);
        }
    }, 300);
    
    closeSharedTextDialog();
    if (sharedTextData.type === 'text') {
        showNotification('Shared text added to Rent form');
    } else {
        showNotification('Image shared - please enter payment details manually');
    }
}

function addSharedTextToExpenses() {
    if (!sharedTextData) return;
    
    // Switch to expenses tab
    showTab('expenses');
    
    // Open the expense form
    setTimeout(() => {
        toggleExpenseForm();
        
        // Only pre-fill if it's text, not image
        if (sharedTextData.type === 'text') {
            const parsed = parseSharedText(sharedTextData.text);
            
            // Fill form with parsed data
            setTimeout(() => {
                if (parsed.amount) {
                    const amountField = document.getElementById('expenseAmount');
                    if (amountField) {
                        amountField.value = parsed.amount;
                    }
                }
                
                if (parsed.date) {
                    const dateField = document.getElementById('expenseDate');
                    if (dateField) {
                        dateField.value = parsed.date;
                    }
                }
                
                if (parsed.notes) {
                    const descriptionField = document.getElementById('expenseDescription');
                    if (descriptionField) {
                        descriptionField.value = parsed.notes;
                    }
                }
            }, 300);
        }
    }, 300);
    
    closeSharedTextDialog();
    if (sharedTextData.type === 'text') {
        showNotification('Shared text added to Expenses form');
    } else {
        showNotification('Image shared - please enter expense details manually');
    }
}

// Add alias for renamed function
function toggleRentForm() {
    toggleMonthlyForm();
}

// Export functions to global scope
window.showSharedTextDialog = showSharedTextDialog;
window.closeSharedTextDialog = closeSharedTextDialog;
window.addSharedTextToRent = addSharedTextToRent;
window.addSharedTextToExpenses = addSharedTextToExpenses;
window.toggleRentForm = toggleRentForm;