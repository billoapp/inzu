// Test the exact filtering logic from renderTenants
console.log('=== TESTING FILTER LOGIC ===');

const localData = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = localData.properties.find(p => p.id == localData.selectedPropertyId);

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 Total tenants:', selectedProperty.tenants.length);

// Test the exact filtering logic from renderTenants
const propertyTenants = selectedProperty.tenants;
console.log('\n🔍 Testing archive filter: tenant.isArchived || tenant.movedOut || tenant.archived');

const archivedTenants = propertyTenants.filter(tenant => tenant.isArchived || tenant.movedOut || tenant.archived);

console.log('📊 Archived tenants found:', archivedTenants.length);
console.log('📦 Archived tenant details:');
archivedTenants.forEach((tenant, index) => {
    console.log(`   ${index + 1}. ${tenant.name} (Unit ${tenant.unit})`);
    console.log(`      isArchived: ${tenant.isArchived}`);
    console.log(`      movedOut: ${tenant.movedOut}`);
    console.log(`      archived: ${tenant.archived}`);
});

// Test each condition individually
console.log('\n🔍 Testing individual conditions:');
propertyTenants.forEach((tenant, index) => {
    console.log(`\n👤 ${tenant.name}:`);
    console.log(`   tenant.isArchived: ${tenant.isArchived}`);
    console.log(`   tenant.movedOut: ${tenant.movedOut}`);
    console.log(`   tenant.archived: ${tenant.archived}`);
    console.log(`   Result: ${tenant.isArchived || tenant.movedOut || tenant.archived}`);
});
