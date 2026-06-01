// Fixed version - no variable conflicts
console.clear();

const appData = JSON.parse(localStorage.getItem('inzuData'));

console.log('🔍 appData.selectedPropertyId:', appData.selectedPropertyId);
console.log('🔍 typeof appData.selectedPropertyId:', typeof appData.selectedPropertyId);
console.log('🔍 appData.selectedPropertyId == null:', appData.selectedPropertyId == null);
console.log('🔍 appData.selectedPropertyId == undefined:', appData.selectedPropertyId == undefined);
console.log('🔍 appData.selectedPropertyId == false:', appData.selectedPropertyId == false);

// Test the exact condition from line 4218
const shouldExitPropertyId = (!appData.selectedPropertyId);
console.log('❌ Should exit due to no propertyId:', shouldExitPropertyId);

if (!shouldExitPropertyId) {
    console.log('✅ PropertyId check passed');
    
    const selectedProperty = appData.properties.find(p => p.id === appData.selectedPropertyId);
    console.log('🔍 selectedProperty found:', !!selectedProperty);
    
    if (selectedProperty) {
        console.log('✅ All checks passed - should continue to tenant rendering');
        console.log('👥 selectedProperty.tenants length:', selectedProperty.tenants?.length);
    }
}
