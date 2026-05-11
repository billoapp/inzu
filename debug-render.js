// Debug the exact renderTenants logic
console.log('=== DEBUG RENDER LOGIC ===');

const localData = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = localData.properties.find(p => p.id == localData.selectedPropertyId);

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 Total tenants:', selectedProperty.tenants.length);

// Test the exact logic from renderTenants
const propertyTenants = selectedProperty.tenants;
console.log('\n🔍 Replicating renderTenants archive logic...');

// This is the exact filter from renderTenants
const archivedTenants = propertyTenants.filter(tenant => tenant.isArchived || tenant.movedOut || tenant.archived);
console.log('📊 Archived tenants count:', archivedTenants.length);
console.log('📦 Archived tenants:', archivedTenants.map(t => t.name));

// Test the condition that should trigger archive section
if (archivedTenants.length > 0) {
    console.log('✅ Archive section SHOULD be rendered (length > 0)');
    
    // Test the sorting logic
    const sortedArchived = archivedTenants.slice().sort((a, b) => {
        const dateA = new Date(a.tenantEnd || a.moveOutDate || '1970-01-01');
        const dateB = new Date(b.tenantEnd || b.moveOutDate || '1970-01-01');
        return dateB - dateA;
    });
    
    console.log('📅 Sorted archived tenants:', sortedArchived.map(t => t.name));
    
    // Test HTML generation
    let testHtml = '<div class="archive-section">';
    testHtml += '<h3 class="section-title archive-title">📦 Past Tenants (Archive)</h3>';
    testHtml += sortedArchived.map(tenant => `
        <div class="entry-card archived-tenant">
            <div class="entry-header">
                <div class="entry-title">${tenant.name}</div>
                <div class="entry-amount">Ksh ${tenant.rent}</div>
                <div class="archived-stamp">Archived</div>
            </div>
        </div>
    `).join('');
    testHtml += '</div>';
    
    console.log('📝 Generated HTML length:', testHtml.length);
    console.log('📝 HTML preview:', testHtml.substring(0, 200));
    
} else {
    console.log('❌ Archive section should NOT be rendered (length = 0)');
}

// Now let's check what's actually in the DOM
console.log('\n🔍 Checking actual DOM...');
const tenantsList = document.getElementById('tenantsList');
if (tenantsList) {
    const actualHtml = tenantsList.innerHTML;
    console.log('📋 Actual HTML length:', actualHtml.length);
    console.log('📋 Contains archive-section:', actualHtml.includes('archive-section'));
    console.log('📋 Contains Sharon:', actualHtml.includes('Sharon'));
}

// Force call renderTenants and check again
console.log('\n🔄 Forcing renderTenants()...');
if (typeof window.renderTenants === 'function') {
    window.renderTenants();
    
    setTimeout(() => {
        const newHtml = document.getElementById('tenantsList').innerHTML;
        console.log('📋 After render - HTML length:', newHtml.length);
        console.log('📋 After render - Contains archive-section:', newHtml.includes('archive-section'));
        console.log('📋 After render - Contains Sharon:', newHtml.includes('Sharon'));
    }, 100);
}
