// Quick diagnostic - run this in browser console
const data = JSON.parse(localStorage.getItem('inzuData'));
console.log('=== QUICK OCCUPANCY CHECK ===');

data.properties.forEach(property => {
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

console.log('\n=== ARCHIVE SECTION CHECK ===');
console.log('Archived tenants should appear in the 📦 Past Tenants section');
console.log('If you still see all units as occupied, try refreshing the page');
