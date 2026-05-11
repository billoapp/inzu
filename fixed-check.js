// Fixed diagnostic - run this in browser console
console.log('=== QUICK OCCUPANCY CHECK ===');

const localData = JSON.parse(localStorage.getItem('inzuData'));
localData.properties.forEach(property => {
    console.log(`🏠 ${property.name}`);
    console.log(`  Units: ${property.units}`);
    console.log(`  Tenants: ${property.tenants.length}`);
    
    const occupied = property.tenants.filter(t => !t.movedOut && !t.isArchived && !t.archived).length;
    const vacant = property.units - occupied;
    
    console.log(`  Occupied: ${occupied}, Vacant: ${vacant}`);
    
    property.tenants.forEach(tenant => {
        const status = tenant.archived ? '📦 ARCHIVED' : '🟢 ACTIVE';
        console.log(`    Unit ${tenant.unit}: ${tenant.name} - ${status}`);
    });
});

console.log('\n=== FORCE REFRESH TENANTS ===');
// Force re-render tenants to see changes
if (window.data && window.data.selectedPropertyId) {
    window.renderTenants();
    window.renderProperties();
    console.log('✅ Forced refresh completed');
}
