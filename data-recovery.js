// Data Recovery Script for Inzu Rental Manager
// Run this in browser console to check for any existing data

// Check Firebase for any data
const { getDatabase, ref, get } = window.firebase || {};
const auth = window.auth || {};

async function checkFirebaseData() {
    console.log('=== Checking Firebase for existing data ===');
    
    if (!auth.currentUser) {
        console.log('❌ No user logged in. Please sign in first.');
        return;
    }
    
    try {
        const database = getDatabase();
        const dataRef = ref(database, `users/${auth.currentUser.uid}/rentalData`);
        
        const snapshot = await get(dataRef);
        if (snapshot.exists()) {
            console.log('✅ Found data in Firebase:', snapshot.val());
            return snapshot.val();
        } else {
            console.log('❌ No data found in Firebase');
            return null;
        }
    } catch (error) {
        console.error('❌ Error checking Firebase:', error);
        return null;
    }
}

// Manual data restoration template
const recoveryTemplate = {
    properties: [
        {
            id: 1769974742409,
            name: "ABC",
            address: "Nairobi",
            type: "apartment",
            units: 21,
            description: "Jakuzi and swimming pool",
            createdAt: "2026-02-01T19:39:02.409Z",
            tenants: [
                {
                    id: 1769974795479,
                    name: "Mike",
                    unit: "1",
                    rent: 50000,
                    phone: "+254700000",
                    email: "amazing@mail.com",
                    since: "2026-01-01",
                    depositPaid: 100000,
                    electricityMeter: "09098765",
                    electricityBalance: 0,
                    waterMeter: "1100001976",
                    waterBalance: 0,
                    createdAt: "2026-02-01T19:39:55.479Z"
                },
                {
                    id: 1769975290169,
                    name: "Mary",
                    unit: "2",
                    rent: 45000,
                    phone: "+2546766554",
                    email: "mary@mail.com",
                    since: "2026-02-01",
                    depositPaid: 90000,
                    electricityMeter: "09098765",
                    electricityBalance: 0,
                    waterMeter: "9484746",
                    waterBalance: 0,
                    createdAt: "2026-02-01T19:48:10.169Z"
                },
                {
                    id: 1769975725857,
                    name: "Simon",
                    unit: "14",
                    rent: 40000,
                    phone: "+2547676542",
                    email: "",
                    since: "2026-01-14",
                    depositPaid: 40000,
                    electricityMeter: "09890987",
                    electricityBalance: 0,
                    waterMeter: "0987687",
                    waterBalance: 0,
                    notes: "",
                    leaseDocuments: [
                        {
                            name: "5152410492.pdf",
                            type: "application/pdf",
                            size: 93663,
                            lastModified: 1762162561559
                        }
                    ],
                    idDocuments: [
                        {
                            name: "johnnie_walker.png",
                            type: "image/png",
                            size: 1953252,
                            lastModified: 1763490813099
                        },
                        {
                            name: "1763485088.png",
                            type: "image/png",
                            size: 1624110,
                            lastModified: 1763485111488
                        }
                    ],
                    createdAt: "2026-02-01T19:55:25.857Z"
                }
            ],
            monthly: [
                {
                    id: 1769975170807,
                    tenantId: "1769974795479",
                    amount: "50000",
                    date: "2026-02-01",
                    notes: "",
                    createdAt: "2026-02-01T19:46:10.807Z"
                }
            ],
            expenses: [
                {
                    id: 1769975192572,
                    category: "maintenance",
                    description: "Grass cutting",
                    amount: "1000",
                    date: "2026-02-01",
                    reference: "",
                    createdAt: "2026-02-01T19:46:32.572Z"
                }
            ],
            moveOuts: []
        }
    ],
    selectedPropertyId: 1769974742409
};

// Function to restore data
function restoreData() {
    console.log('=== Restoring Data ===');
    try {
        // Set the global data object
        window.data = recoveryTemplate;
        
        // Save to localStorage
        localStorage.setItem('inzuData', JSON.stringify(recoveryTemplate));
        localStorage.setItem('lastSaved', new Date().toLocaleString());
        
        console.log('✅ Data restored to localStorage');
        console.log('🔄 Refreshing the page to load restored data...');
        
        // Refresh the page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error restoring data:', error);
    }
}

// Instructions
console.log(`
=== DATA RECOVERY INSTRUCTIONS ===
1. First check if data exists in Firebase: checkFirebaseData()
2. If no data found, restore from backup: restoreData()
3. The app will automatically refresh after restoration
================================
`);
