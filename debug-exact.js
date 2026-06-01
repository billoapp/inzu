// Debug exact renderTenants flow
console.clear();

// Get the exact same data as renderTenants
const data = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = data.properties.find(p => p.id == data.selectedPropertyId);
const container = document.getElementById('tenantsList');

console.log('🏠 selectedProperty:', selectedProperty);
console.log('👥 selectedProperty.tenants:', selectedProperty.tenants);
console.log('📊 typeof selectedProperty.tenants:', typeof selectedProperty.tenants);
console.log('📏 selectedProperty.tenants.length:', selectedProperty.tenants?.length);

// Test the exact condition from renderTenants
const propertyTenants = selectedProperty.tenants || [];
console.log('🔍 propertyTenants:', propertyTenants);
console.log('📏 propertyTenants.length:', propertyTenants.length);

// Test the condition
const shouldExitEarly = (!propertyTenants || propertyTenants.length === 0);
console.log('❌ Should exit early:', shouldExitEarly);

if (shouldExitEarly) {
    console.log('🚫 This is why renderTenants exits early!');
} else {
    console.log('✅ Should continue to active tenants section');
    
    // Test active tenants filtering
    const activeTenants = propertyTenants.filter(tenant => !tenant.archived && !tenant.isArchived && !tenant.movedOut);
    console.log('🟢 Active tenants:', activeTenants.length);
    
    const archivedTenants = propertyTenants.filter(tenant => tenant.archived || tenant.isArchived || tenant.movedOut);
    console.log('📦 Archived tenants:', archivedTenants.length);
    
    archivedTenants.forEach((tenant, i) => {
        console.log(`   ${i+1}. ${tenant.name} - archived:${tenant.archived} isArchived:${tenant.isArchived} movedOut:${tenant.movedOut}`);
    });
}
