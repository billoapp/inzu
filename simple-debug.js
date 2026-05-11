// Simple debug - run this in browser console
console.log('=== TENANT DEBUG ===');

const localData = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = localData.properties.find(p => p.id == localData.selectedPropertyId);

console.log(`🏠 Property: ${selectedProperty.name}`);
console.log(`👥 Total tenants: ${selectedProperty.tenants.length}`);

selectedProperty.tenants.forEach((tenant, index) => {
    console.log(`\n👤 Tenant ${index + 1}: ${tenant.name}`);
    console.log(`   Unit: ${tenant.unit}`);
    console.log(`   archived: ${tenant.archived}`);
    console.log(`   isArchived: ${tenant.isArchived}`);
    console.log(`   movedOut: ${tenant.movedOut}`);
    
    const shouldBeArchived = tenant.archived || tenant.isArchived || tenant.movedOut;
    console.log(`   📦 Should be in archive: ${shouldBeArchived}`);
});

const archivedCount = selectedProperty.tenants.filter(t => 
    t.archived || t.isArchived || t.movedOut
).length;

console.log(`\n📊 Archive section should show ${archivedCount} tenants`);
