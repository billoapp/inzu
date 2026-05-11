// Debug archive section - run this in browser console
console.log('=== DEBUG ARCHIVE SECTION ===');

const data = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = data.properties.find(p => p.id == data.selectedPropertyId);

if (!selectedProperty) {
    console.log('❌ No selected property found');
} else {
    console.log(`🏠 Selected property: ${selectedProperty.name}`);
    console.log(`👥 Total tenants: ${selectedProperty.tenants.length}`);
    
    // Check each tenant individually
    selectedProperty.tenants.forEach((tenant, index) => {
        console.log(`\n👤 Tenant ${index + 1}: ${tenant.name}`);
        console.log(`   Unit: ${tenant.unit}`);
        console.log(`   archived: ${tenant.archived}`);
        console.log(`   isArchived: ${tenant.isArchived}`);
        console.log(`   movedOut: ${tenant.movedOut}`);
        console.log(`   tenantEnd: ${tenant.tenantEnd}`);
        console.log(`   moveOutDate: ${tenant.moveOutDate}`);
        
        const isArchived = tenant.archived || tenant.isArchived || tenant.movedOut;
        console.log(`   📦 Should be in archive: ${isArchived}`);
    });
    
    // Check archive filtering
    const archivedTenants = selectedProperty.tenants.filter(tenant => 
        tenant.archived || tenant.isArchived || tenant.movedOut
    );
    
    console.log(`\n📊 Archive filtering results:`);
    console.log(`   Tenants that should appear in archive: ${archivedTenants.length}`);
    
    if (archivedTenants.length > 0) {
        console.log(`   Archive tenant names:`, archivedTenants.map(t => t.name));
    } else {
        console.log(`   ❌ No tenants found for archive section`);
    }
    
    // Force render tenants to see what happens
    console.log(`\n🔄 Forcing tenant render...`);
    if (typeof window.renderTenants === 'function') {
        window.renderTenants();
        console.log(`✅ renderTenants() called`);
    } else {
        console.log(`❌ renderTenants() function not found`);
    }
}
