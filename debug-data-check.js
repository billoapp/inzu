// Debug the data checks in renderTenants
console.clear();

const data = JSON.parse(localStorage.getItem('inzuData'));

console.log('🔍 data.selectedPropertyId:', data.selectedPropertyId);
console.log('🔍 typeof data.selectedPropertyId:', typeof data.selectedPropertyId);
console.log('🔍 data.selectedPropertyId == null:', data.selectedPropertyId == null);
console.log('🔍 data.selectedPropertyId == undefined:', data.selectedPropertyId == undefined);
console.log('🔍 data.selectedPropertyId == false:', data.selectedPropertyId == false);

// Test the exact condition from line 4218
const shouldExitPropertyId = (!data.selectedPropertyId);
console.log('❌ Should exit due to no propertyId:', shouldExitPropertyId);

if (!shouldExitPropertyId) {
    console.log('✅ PropertyId check passed');
    
    const selectedProperty = data.properties.find(p => p.id === data.selectedPropertyId);
    console.log('🔍 selectedProperty found:', !!selectedProperty);
    
    if (selectedProperty) {
        console.log('✅ All checks passed - should continue to tenant rendering');
        console.log('👥 selectedProperty.tenants length:', selectedProperty.tenants?.length);
    }
}
