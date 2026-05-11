// Debug the exact renderTenants execution
console.log('=== DEBUG RENDER TENANTS EXECUTION ===');

// Patch the renderTenants function to add debug logging
const originalRenderTenants = window.renderTenants;

window.renderTenants = function() {
    console.log('🔍 === STARTING RENDER TENANTS DEBUG ===');
    
    // Call original function but capture the HTML before it's set
    const container = document.getElementById('tenantsList');
    if (!container) {
        console.log('❌ No container found');
        return;
    }
    
    // Get the data that renderTenants uses
    const data = JSON.parse(localStorage.getItem('inzuData'));
    const selectedProperty = data.properties.find(p => p.id == data.selectedPropertyId);
    const propertyTenants = selectedProperty.tenants || [];
    
    console.log('🏠 Property:', selectedProperty.name);
    console.log('👥 Total tenants:', propertyTenants.length);
    
    // Test the exact filtering logic
    const activeTenants = propertyTenants.filter(tenant => !tenant.isArchived && !tenant.movedOut && !tenant.archived);
    const archivedTenants = propertyTenants.filter(tenant => tenant.isArchived || tenant.movedOut || tenant.archived);
    
    console.log('📊 Active tenants:', activeTenants.length);
    console.log('📦 Archived tenants:', archivedTenants.length);
    console.log('📦 Archived tenant names:', archivedTenants.map(t => t.name));
    
    // Manually build the HTML to see what should be generated
    let html = '';
    
    // Active tenants section
    html += '<div class="tenants-section">';
    html += '<h3 class="section-title">🏠 Active Tenants</h3>';
    // ... (skip active tenants for brevity)
    html += '</div>';
    
    // Archive section - THIS IS THE KEY PART
    console.log('\n🔍 Building archive section...');
    if (archivedTenants.length > 0) {
        console.log('✅ Archive condition met (length > 0)');
        
        const sortedArchived = archivedTenants.slice().sort((a, b) => {
            const dateA = new Date(a.tenantEnd || a.moveOutDate || '1970-01-01');
            const dateB = new Date(b.tenantEnd || b.moveOutDate || '1970-01-01');
            return dateB - dateA;
        });
        
        console.log('📅 Sorted archived tenants:', sortedArchived.map(t => t.name));
        
        html += '<div class="archive-section">';
        html += '<h3 class="section-title archive-title">📦 Past Tenants (Archive)</h3>';
        html += sortedArchived.map(tenant => `
            <div class="entry-card archived-tenant">
                <div class="entry-header">
                    <div class="entry-title">${tenant.name}</div>
                    <div class="entry-amount">Ksh ${tenant.rent}</div>
                    <div class="archived-stamp">Archived</div>
                </div>
                <div class="entry-details">
                    <div><span class="field-label">Unit:</span> ${tenant.unit}</div>
                    <div><span class="field-label">Phone:</span> ${tenant.phone || 'Not provided'}</div>
                    <div><span class="field-label">Email:</span> ${tenant.email || 'Not provided'}</div>
                    <div><span class="field-label">Moved In:</span> ${tenant.since ? new Date(tenant.since).toLocaleDateString() : 'Not specified'}</div>
                    <div><span class="field-label">Moved Out:</span> ${tenant.tenantEnd ? new Date(tenant.tenantEnd).toLocaleDateString() : (tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString() : 'Not specified')}</div>
                    <div><span class="field-label">Deposit Returned:</span> Ksh ${tenant.depositReturned || 0}</div>
                    ${tenant.finalBillAmount ? `<div><span class="field-label">Final Bill:</span> Ksh ${tenant.finalBillAmount}</div>` : ''}
                    ${tenant.notes ? `<div class="tenant-notes">${tenant.notes}</div>` : ''}
                </div>
            </div>
        `).join('');
        html += '</div>';
        
        console.log('✅ Archive HTML added to string');
        console.log('📝 Archive HTML length:', html.length);
        console.log('📝 Contains archive-section:', html.includes('archive-section'));
        
    } else {
        console.log('❌ Archive condition NOT met (length = 0)');
    }
    
    console.log('📝 Final HTML length:', html.length);
    console.log('📝 Final HTML contains archive-section:', html.includes('archive-section'));
    console.log('📝 Final HTML contains Sharon:', html.includes('Sharon'));
    
    // Now call the original function
    console.log('\n🔄 Calling original renderTenants...');
    originalRenderTenants();
    
    // Check what actually ended up in the DOM
    setTimeout(() => {
        const finalHtml = container.innerHTML;
        console.log('\n🔍 AFTER ORIGINAL RENDER:');
        console.log('📋 Final DOM HTML length:', finalHtml.length);
        console.log('📋 Final DOM contains archive-section:', finalHtml.includes('archive-section'));
        console.log('📋 Final DOM contains Sharon:', finalHtml.includes('Sharon'));
        
        if (!finalHtml.includes('archive-section')) {
            console.log('❌ BUG CONFIRMED: Archive section missing from DOM!');
            console.log('📋 HTML preview (first 1000 chars):', finalHtml.substring(0, 1000));
        }
    }, 100);
};

// Trigger the debug render
console.log('🚀 Triggering debug render...');
window.renderTenants();
