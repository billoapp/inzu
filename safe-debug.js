// Safe debug script - handle missing data
console.clear();

const appData = JSON.parse(localStorage.getItem('inzuData'));

console.log('📊 App Data Check:');
console.log('selectedPropertyId:', appData.selectedPropertyId);
console.log('Total properties:', appData.properties?.length || 0);

if (!appData.selectedPropertyId) {
    console.log('❌ No property selected!');
} else {
    const selectedProperty = appData.properties.find(p => p.id == appData.selectedPropertyId);
    
    if (!selectedProperty) {
        console.log('❌ Property not found for ID:', appData.selectedPropertyId);
        console.log('Available property IDs:', appData.properties.map(p => p.id));
    } else {
        console.log('✅ Property found:', selectedProperty.name);
        console.log('👥 Total tenant entries:', selectedProperty.tenants?.length || 0);

        // Test occupancy calculation
        const totalUnits = selectedProperty.units || 1;
        const occupiedUnits = selectedProperty.tenants?.filter(t => !t.archived).length || 0;
        const vacantUnits = totalUnits - occupiedUnits;
        const occupancyText = `${occupiedUnits}/${totalUnits} Occupied - ${vacantUnits} Vacant`;

        console.log('\n📊 Occupancy Calculation:');
        console.log('Total units:', totalUnits);
        console.log('Active tenants (filtered):', occupiedUnits);
        console.log('Vacant units:', vacantUnits);
        console.log('Occupancy text:', occupancyText);

        // Show tenant breakdown
        console.log('\n🟢 Active Tenants:');
        selectedProperty.tenants?.filter(t => !t.archived).forEach(t => {
            console.log(`  - ${t.name} - Unit ${t.unit}`);
        });

        console.log('\n📦 Archived Tenants:');
        selectedProperty.tenants?.filter(t => t.archived).forEach(t => {
            console.log(`  - ${t.name} - Unit ${t.unit}`);
        });
    }
}
