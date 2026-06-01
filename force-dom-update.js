// Force DOM update for property list
console.clear();

const appData = JSON.parse(localStorage.getItem('inzuData'));
const shirereProperty = appData.properties.find(p => p.name === 'Shirere Villas');

if (shirereProperty) {
    console.log('✅ Found Shirere Villas');
    
    // Ensure it's selected
    appData.selectedPropertyId = shirereProperty.id;
    localStorage.setItem('inzuData', JSON.stringify(appData));
    
    // Calculate correct occupancy
    const totalUnits = shirereProperty.units || 1;
    const occupiedUnits = shirereProperty.tenants?.filter(t => !t.archived).length || 0;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyText = `${occupiedUnits}/${totalUnits} Occupied - ${vacantUnits} Vacant`;
    
    console.log('📊 Correct occupancy:', occupancyText);
    
    // Force renderProperties multiple times
    console.log('🔄 Forcing multiple renders...');
    
    // First render
    if (typeof window.renderProperties === 'function') {
        window.renderProperties();
    }
    
    // Second render after a delay
    setTimeout(() => {
        if (typeof window.renderProperties === 'function') {
            window.renderProperties();
            console.log('✅ Second render completed');
        }
    }, 100);
    
    // Third render after another delay
    setTimeout(() => {
        if (typeof window.renderProperties === 'function') {
            window.renderProperties();
            console.log('✅ Third render completed');
        }
        
        // Check the actual DOM content
        setTimeout(() => {
            const propertyCards = document.querySelectorAll('.property-card');
            propertyCards.forEach((card, index) => {
                const detailsDiv = card.querySelector('.property-details');
                if (detailsDiv) {
                    console.log(`Property ${index + 1} details:`, detailsDiv.textContent);
                }
            });
        }, 200);
    }, 300);
    
} else {
    console.log('❌ Shirere Villas not found');
}
