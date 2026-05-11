// Clear console and test only archive functionality
console.clear();
console.log('=== TESTING ARCHIVE ONLY ===');

// Get current data and test
const localData = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = localData.properties.find(p => p.id == localData.selectedPropertyId);

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 Total tenants:', selectedProperty.tenants.length);

// Test archive filtering
const archivedTenants = selectedProperty.tenants.filter(tenant => 
    tenant.archived || tenant.isArchived || tenant.movedOut
);

console.log('📦 Archived tenants:', archivedTenants.length);
archivedTenants.forEach((tenant, i) => {
    console.log(`   ${i+1}. ${tenant.name} - Unit ${tenant.unit}`);
});

// Force render and check
console.log('\n🔄 Forcing render...');
if (typeof window.renderTenants === 'function') {
    window.renderTenants();
    
    // Check result
    setTimeout(() => {
        const container = document.getElementById('tenantsList');
        const hasArchive = container.innerHTML.includes('archive-section');
        const hasSharon = container.innerHTML.includes('Sharon');
        
        console.log('\n📊 RESULTS:');
        console.log('✅ Archive section in DOM:', hasArchive);
        console.log('✅ Sharon in DOM:', hasSharon);
        
        if (!hasArchive) {
            console.log('❌ Archive section still missing!');
        }
    }, 200);
}
