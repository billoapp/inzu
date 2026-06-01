// Force select the Shirere Villas property
console.clear();

const appData = JSON.parse(localStorage.getItem('inzuData'));

// Find Shirere Villas property
const shirereProperty = appData.properties.find(p => p.name === 'Shirere Villas');

if (shirereProperty) {
    console.log('✅ Found Shirere Villas property:', shirereProperty.id);
    
    // Set it as selected
    appData.selectedPropertyId = shirereProperty.id;
    localStorage.setItem('inzuData', JSON.stringify(appData));
    
    console.log('✅ Property selected! ID:', shirereProperty.id);
    
    // Test occupancy calculation
    const totalUnits = shirereProperty.units || 1;
    const occupiedUnits = shirereProperty.tenants?.filter(t => !t.archived).length || 0;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyText = `${occupiedUnits}/${totalUnits} Occupied - ${vacantUnits} Vacant`;
    
    console.log('\n📊 Updated Occupancy Calculation:');
    console.log('Total units:', totalUnits);
    console.log('Active tenants (filtered):', occupiedUnits);
    console.log('Vacant units:', vacantUnits);
    console.log('Occupancy text:', occupancyText);
    
    // Force re-render properties
    console.log('\n🔄 Forcing renderProperties...');
    if (typeof window.renderProperties === 'function') {
        window.renderProperties();
        console.log('✅ renderProperties completed');
    }
    
    console.log('\n🎯 Property selection fixed! Check the property list now.');
    
} else {
    console.log('❌ Shirere Villas property not found');
    console.log('Available properties:', appData.properties.map(p => p.name));
}
