// Diagnostic script to check tenant field names
// Run this in browser console to see exactly what fields your tenants have

function checkAllTenantFields() {
    console.log('=== CHECKING ALL TENANT FIELDS ===');
    
    // Check Firebase first
    if (window.auth && window.auth.currentUser) {
        const database = window.firebase.getDatabase();
        const dataRef = window.firebase.ref(database, `users/${window.auth.currentUser.uid}/rentalData`);
        
        window.firebase.get(dataRef).then(snapshot => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                analyzeTenantData(data, 'Firebase');
            } else {
                console.log('No Firebase data, checking localStorage...');
                checkLocalStorageFields();
            }
        }).catch(error => {
            console.log('Firebase error, checking localStorage:', error);
            checkLocalStorageFields();
        });
    } else {
        checkLocalStorageFields();
    }
}

function checkLocalStorageFields() {
    const localData = localStorage.getItem('inzuData');
    if (localData) {
        const data = JSON.parse(localData);
        analyzeTenantData(data, 'LocalStorage');
    } else {
        console.log('❌ No data found anywhere');
    }
}

function analyzeTenantData(data, source) {
    console.log(`\n=== ANALYZING DATA FROM ${source} ===`);
    
    if (!data.properties || data.properties.length === 0) {
        console.log('❌ No properties found');
        return;
    }
    
    data.properties.forEach((property, propIndex) => {
        console.log(`\n🏠 Property ${propIndex + 1}: ${property.name}`);
        
        if (!property.tenants || property.tenants.length === 0) {
            console.log('  ✅ No tenants in this property');
            return;
        }
        
        console.log(`  📊 Total tenants: ${property.tenants.length}`);
        
        // Check each tenant's fields
        property.tenants.forEach((tenant, tenantIndex) => {
            console.log(`\n  👤 Tenant ${tenantIndex + 1}: ${tenant.name || 'Unnamed'}`);
            console.log('     All fields:', Object.keys(tenant));
            
            // Check specific fields we care about
            console.log('     Field values:');
            console.log(`       - movedOut: ${tenant.movedOut}`);
            console.log(`       - isArchived: ${tenant.isArchived}`);
            console.log(`       - archived: ${tenant.archived}`);
            console.log(`       - tenantEnd: ${tenant.tenantEnd}`);
            console.log(`       - moveOutDate: ${tenant.moveOutDate}`);
            console.log(`       - depositReturned: ${tenant.depositReturned}`);
            console.log(`       - finalBillAmount: ${tenant.finalBillAmount}`);
            console.log(`       - unit: ${tenant.unit}`);
            console.log(`       - depositPaid: ${tenant.depositPaid}`);
            
            // Determine if this tenant is "archived" by any criteria
            const isArchivedByAny = [
                tenant.movedOut === true,
                tenant.isArchived === true,
                tenant.archived === true,
                !!tenant.tenantEnd,
                !!tenant.moveOutDate,
                !!tenant.depositReturned
            ];
            
            console.log(`     🏷️  Archive indicators:`, isArchivedByAny);
            
            if (isArchivedByAny.some(indicator => indicator)) {
                console.log(`     📦 This tenant appears to be ARCHIVED/MOVED OUT`);
            } else {
                console.log(`     🟢 This tenant appears to be ACTIVE`);
            }
        });
        
        // Calculate occupancy using different methods
        const totalTenants = property.tenants.length;
        const activeByMovedOut = property.tenants.filter(t => t.movedOut !== true).length;
        const activeByIsArchived = property.tenants.filter(t => t.isArchived !== true).length;
        const activeByArchived = property.tenants.filter(t => t.archived !== true).length;
        const activeByCombined = property.tenants.filter(t => !t.movedOut && !t.isArchived).length;
        const activeByCombinedAlt = property.tenants.filter(t => t.movedOut !== true && t.isArchived !== true).length;
        
        console.log(`\n  📈 OCCUPANCY CALCULATIONS:`);
        console.log(`     Total tenants: ${totalTenants}`);
        console.log(`     Active (movedOut !== true): ${activeByMovedOut}`);
        console.log(`     Active (isArchived !== true): ${activeByIsArchived}`);
        console.log(`     Active (archived !== true): ${activeByArchived}`);
        console.log(`     Active (!movedOut && !isArchived): ${activeByCombined}`);
        console.log(`     Active (movedOut !== true && isArchived !== true): ${activeByCombinedAlt}`);
        console.log(`     Property units: ${property.units}`);
        console.log(`     Vacant by combined: ${property.units - activeByCombined}`);
    });
}

console.log('🔍 TENANT FIELD DIAGNOSTIC');
console.log('Run: checkAllTenantFields()');
console.log('This will show exactly what fields your tenants have and which ones are archived');

// Auto-run
checkAllTenantFields();
