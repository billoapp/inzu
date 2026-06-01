// Check tenant count discrepancy
console.clear();

const data = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = data.properties.find(p => p.id == data.selectedPropertyId);

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 You say you have 5 tenants, but the system shows:', selectedProperty.tenants?.length || 0);

console.log('\n📋 All tenant entries:');
selectedProperty.tenants?.forEach((tenant, i) => {
    if (!tenant) {
        console.log(`❌ Tenant ${i}: NULL/UNDEFINED`);
    } else {
        console.log(`✅ Tenant ${i}: ${tenant.name} - Unit ${tenant.unit}`);
    }
});

// Check for null/undefined tenants
const validTenants = selectedProperty.tenants?.filter(t => t != null) || [];
console.log('\n📊 Summary:');
console.log('Total entries:', selectedProperty.tenants?.length || 0);
console.log('Valid tenants:', validTenants.length);
console.log('Null/undefined entries:', (selectedProperty.tenants?.length || 0) - validTenants.length);

// Test the exact condition from renderTenants
const propertyTenants = selectedProperty.tenants || [];
const shouldExitEarly = (!propertyTenants || propertyTenants.length === 0);
console.log('\n🔍 Early exit condition:', shouldExitEarly);
