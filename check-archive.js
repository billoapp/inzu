// Archive Data Check Script
// Run this in your browser console to check for archived tenants

async function checkArchivedTenants() {
    if (!window.auth.currentUser) {
        console.log('Please sign in first');
        return;
    }
    
    const database = window.firebase.getDatabase();
    const dataRef = window.firebase.ref(database, `users/${window.auth.currentUser.uid}/rentalData`);
    
    const snapshot = await window.firebase.get(dataRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('=== CHECKING FOR ARCHIVED TENANTS ===');
        
        data.properties.forEach(property => {
            console.log(`\n🏠 Property: ${property.name}`);
            
            if (property.tenants) {
                const archivedTenants = property.tenants.filter(t => 
                    t.isArchived || t.movedOut || t.tenantEnd || t.moveOutDate
                );
                
                if (archivedTenants.length > 0) {
                    console.log(`📦 Found ${archivedTenants.length} archived tenants:`);
                    archivedTenants.forEach(tenant => {
                        console.log(`  - ${tenant.name} (Unit ${tenant.unit})`);
                        console.log(`    Moved Out: ${tenant.moveOutDate || tenant.tenantEnd || 'Unknown'}`);
                        console.log(`    Is Archived: ${tenant.isArchived || false}`);
                        console.log(`    Moved Out: ${tenant.movedOut || false}`);
                    });
                } else {
                    console.log('✅ No archived tenants found');
                }
                
                console.log(`📊 Total tenants: ${property.tenants.length}`);
                console.log(`🟢 Active tenants: ${property.tenants.filter(t => !t.isArchived && !t.movedOut).length}`);
                console.log(`📦 Archived tenants: ${property.tenants.filter(t => t.isArchived || t.movedOut).length}`);
            }
        });
    } else {
        console.log('❌ No data found in Firebase');
    }
}

// Also check localStorage
function checkLocalStorageArchive() {
    console.log('\n=== CHECKING LOCAL STORAGE ===');
    const localData = localStorage.getItem('inzuData');
    
    if (localData) {
        const data = JSON.parse(localData);
        console.log('Found local data, checking for archives...');
        
        data.properties.forEach(property => {
            console.log(`\n🏠 Property: ${property.name}`);
            
            if (property.tenants) {
                const archivedTenants = property.tenants.filter(t => 
                    t.isArchived || t.movedOut || t.tenantEnd || t.moveOutDate
                );
                
                if (archivedTenants.length > 0) {
                    console.log(`📦 Found ${archivedTenants.length} archived tenants in localStorage:`);
                    archivedTenants.forEach(tenant => {
                        console.log(`  - ${tenant.name} (Unit ${tenant.unit})`);
                        console.log(`    Moved Out: ${tenant.moveOutDate || tenant.tenantEnd || 'Unknown'}`);
                    });
                } else {
                    console.log('✅ No archived tenants found in localStorage');
                }
            }
        });
    } else {
        console.log('❌ No local data found');
    }
}

console.log('=== Archive Check Instructions ===');
console.log('1. Run: checkArchivedTenants()');
console.log('2. Run: checkLocalStorageArchive()');
console.log('=====================================');

// Auto-run localStorage check
checkLocalStorageArchive();
