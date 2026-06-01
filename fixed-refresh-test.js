// Fixed version - no variable conflicts
console.clear();

// Get current data
const appData = JSON.parse(localStorage.getItem('inzuData'));
const selectedProperty = appData.properties.find(p => p.id == appData.selectedPropertyId);

console.log('🏠 Property:', selectedProperty.name);
console.log('👥 Total tenant entries:', selectedProperty.tenants?.length);

// Test the exact occupancy calculation from renderProperties
const totalUnits = selectedProperty.units || 1;
const occupiedUnits = selectedProperty.tenants?.filter(t => !t.archived).length || 0;
const vacantUnits = totalUnits - occupiedUnits;
const occupancyText = `${occupiedUnits}/${totalUnits} Occupied - ${vacantUnits} Vacant`;

console.log('\n📊 Occupancy Calculation:');
console.log('Total units:', totalUnits);
console.log('Active tenants (filtered):', occupiedUnits);
console.log('Vacant units:', vacantUnits);
console.log('Occupancy text:', occupancyText);

// Show which tenants are counted as active
console.log('\n🟢 Active Tenants (counted in occupancy):');
selectedProperty.tenants?.filter(t => !t.archived).forEach(t => {
    console.log(`  - ${t.name} - Unit ${t.unit}`);
});

console.log('\n📦 Archived Tenants (excluded from occupancy):');
selectedProperty.tenants?.filter(t => t.archived).forEach(t => {
    console.log(`  - ${t.name} - Unit ${t.unit}`);
});

// Force re-render properties
console.log('\n🔄 Forcing renderProperties...');
if (typeof window.renderProperties === 'function') {
    window.renderProperties();
    console.log('✅ renderProperties completed');
}
