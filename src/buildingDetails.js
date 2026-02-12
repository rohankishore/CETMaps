// Handles showing building details without page refresh
// Usage: showBuildingDetails(buildingId)

let buildingDetailsData = {};

async function loadBuildingDetails() {
  if (Object.keys(buildingDetailsData).length > 0) return buildingDetailsData;
  const resp = await fetch('./data/building.json');
  const arr = await resp.json();
  // Convert array to object keyed by name
  buildingDetailsData = {};
  arr.forEach(b => { buildingDetailsData[b.name] = b; });
  return buildingDetailsData;
}

async function showBuildingDetails(buildingId) {
  await loadBuildingDetails();
  const details = buildingDetailsData[buildingId];
  const modal = document.getElementById('buildingDetails');
  const content = document.getElementById('buildingDetailsContent');
  if (!details) {
    content.innerHTML = '<p>No details found.</p>';
    modal.style.display = 'block';
    return;
  }
  let html = `<h2>${details.name}</h2>`;
  html += '<ul>';
  details.floors.forEach(floor => {
    html += `<li>Floor ${floor.floor}: Rooms ${floor.rooms}, Bathrooms: ${floor.bathrooms}, Halls: ${floor.halls}</li>`;
  });
  html += '</ul>';
  content.innerHTML = html;
  modal.style.display = 'block';
}

export { showBuildingDetails, loadBuildingDetails };