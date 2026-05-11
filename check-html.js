// Check if archive HTML is being rendered
console.log('=== CHECKING ARCHIVE HTML ===');

const localData = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = localData.properties.find(p => p.id == localData.selectedPropertyId);

// Get the tenants list container
const tenantsList = document.getElementById('tenantsList');
if (tenantsList) {
    console.log('📋 Tenants list container found');
    const html = tenantsList.innerHTML;
    
    // Check if archive section exists in HTML
    if (html.includes('archive-section')) {
        console.log('✅ Archive section found in HTML');
        
        // Count archive section entries
        const archiveMatches = html.match(/archived-tenant/g);
        console.log(`📦 Archived tenant entries in HTML: ${archiveMatches ? archiveMatches.length : 0}`);
        
        // Look for Sharon specifically
        if (html.includes('Sharon')) {
            console.log('✅ Sharon found in HTML');
            // Find Sharon's entry
            const sharonIndex = html.indexOf('Sharon');
            const sharonContext = html.substring(Math.max(0, sharonIndex - 100), sharonIndex + 200);
            console.log('Sharon context:', sharonContext);
        } else {
            console.log('❌ Sharon NOT found in HTML');
        }
    } else {
        console.log('❌ Archive section NOT found in HTML');
        console.log('HTML length:', html.length);
        
        // Show first 500 chars of HTML to debug
        console.log('HTML preview:', html.substring(0, 500));
    }
} else {
    console.log('❌ Tenants list container not found');
}
