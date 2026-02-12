// Handles showing building details without page refresh
// Usage: showBuildingDetails(buildingId)

const buildingDetailsData = {
  // Example structure, should be replaced with real data or fetched from server
  'Main Building': {
    name: 'Main Building',
    floors: [
      { floor: 1, rooms: '101-120', bathrooms: 2, halls: 1 },
      { floor: 2, rooms: '201-220', bathrooms: 2, halls: 1 },
      { floor: 3, rooms: '301-320', bathrooms: 2, halls: 1 }
    ]
  },
  // Add more buildings here
};

function showBuildingDetails(buildingId) {
  const details = buildingDetailsData[buildingId];
  const detailsContainer = document.getElementById('buildingDetails');
  if (!details) {
    detailsContainer.innerHTML = '<p>No details found.</p>';
    return;
  }
  let html = `<h2>${details.name}</h2>`;
  html += '<ul>';
  details.floors.forEach(floor => {
    html += `<li>Floor ${floor.floor}: Rooms ${floor.rooms}, Bathrooms: ${floor.bathrooms}, Halls: ${floor.halls}</li>`;
  });
  html += '</ul>';
  detailsContainer.innerHTML = html;
}

export { showBuildingDetails, buildingDetailsData };