// Fix Sharon's archive display issue
console.clear();

const data = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = data.properties.find(p => p.id == data.selectedPropertyId);

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 Total tenant entries:', selectedProperty.tenants?.length);

// Check Sharon's status
const sharon = selectedProperty.tenants?.find(t => t.name === 'Sharon');
if (sharon) {
    console.log('\n👤 Sharon found:');
    console.log('  - archived:', sharon.archived);
    console.log('  - isArchived:', sharon.isArchived);
    console.log('  - movedOut:', sharon.movedOut);
    console.log('  - tenantEnd:', sharon.tenantEnd);
    console.log('  - moveOutDate:', sharon.moveOutDate);
    
    const shouldBeArchived = sharon.archived || sharon.isArchived || sharon.movedOut;
    console.log('  - Should be in archive:', shouldBeArchived);
} else {
    console.log('❌ Sharon not found in tenant list');
}

// Test the filtering
const activeTenants = selectedProperty.tenants?.filter(t => !t.archived && !t.isArchived && !t.movedOut) || [];
const archivedTenants = selectedProperty.tenants?.filter(t => t.archived || t.isArchived || t.movedOut) || [];

console.log('\n📊 Current Status:');
console.log('Active tenants:', activeTenants.length);
console.log('Archived tenants:', archivedTenants.length);

console.log('\n🟢 Active Tenants:');
activeTenants.forEach(t => console.log(`  - ${t.name} - Unit ${t.unit}`));

console.log('\n📦 Archived Tenants:');
archivedTenants.forEach(t => console.log(`  - ${t.name} - Unit ${t.unit}`));

// Force render tenants to show archive section
console.log('\n🔄 Forcing renderTenants...');
if (typeof window.renderTenants === 'function') {
    window.renderTenants();
    
    setTimeout(() => {
        const container = document.getElementById('tenantsList');
        const hasArchive = container.innerHTML.includes('archive-section');
        console.log('\n✅ Archive section now visible:', hasArchive);
        
        if (!hasArchive) {
            console.log('❌ Archive section still not showing - need to investigate further');
        }
    }, 200);
}
