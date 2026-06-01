// Quick debug to see what's happening in renderTenants
console.clear();

// Get the data
const data = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = data.properties.find(p => p.id == data.selectedPropertyId);
const propertyTenants = selectedProperty.tenants || [];

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 Total tenants:', propertyTenants.length);

// Check each tenant's archive status
propertyTenants.forEach((tenant, i) => {
    console.log(`Tenant ${i+1}: ${tenant.name}`);
    console.log(`  - archived: ${tenant.archived}`);
    console.log(`  - isArchived: ${tenant.isArchived}`);
    console.log(`  - movedOut: ${tenant.movedOut}`);
    console.log(`  - Should be active: ${!tenant.archived && !tenant.isArchived && !tenant.movedOut}`);
});

// Test the exact filtering logic
const activeTenants = propertyTenants.filter(tenant => !tenant.archived && !tenant.isArchived && !tenant.movedOut);
const archivedTenants = propertyTenants.filter(tenant => tenant.archived || tenant.isArchived || tenant.movedOut);

console.log('\n📊 Filtering Results:');
console.log('Active tenants:', activeTenants.length);
console.log('Archived tenants:', archivedTenants.length);

// Check if there's an error in the renderTenants function
console.log('\n🔍 Testing renderTenants...');
try {
    if (typeof window.renderTenants === 'function') {
        console.log('✅ renderTenants function exists');
        window.renderTenants();
        console.log('✅ renderTenants completed');
    } else {
        console.log('❌ renderTenants function not found');
    }
} catch (error) {
    console.log('❌ Error in renderTenants:', error.message);
}
