let data;
let selectedPlanetIndex = -1;
const scale = 1.5; // Zoom scale
const radius = 40; // Planet orbit radius in %
const nodeRadiusBase = 10; // Node ring radius in %
const hoverSfx = document.getElementById('hover-sfx');
const bgMusic = document.getElementById('bg-music');
let muted = false;

// Load data and initialize
async function init() {
  let json = localStorage.getItem('achievements_master');
  if (json) {
    data = JSON.parse(json);
  } else {
    const res = await fetch('achievements.json');
    data = await res.json();
  }
  updateStatuses();
  renderStarryBg();
  renderPlanets();
  renderBranches();
  renderJunctions();
  document.addEventListener('click', () => bgMusic.play().catch(() => {}), { once: true });
  document.getElementById('mute-toggle').addEventListener('click', toggleMute);
  document.addEventListener('keydown', handleKeyboard);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'a') promptAdmin();
  });
}

// Update statuses based on completion
function updateStatuses() {
  data.planets.forEach(planet => {
    planet.tiers.forEach((tier, tIndex) => {
      if (tIndex === 0) return;
      const prevTier = planet.tiers[tIndex - 1];
      const allCompleted = prevTier.achievements.every(ach => ach.status === 'completed');
      if (allCompleted) {
        tier.achievements.forEach(ach => {
          if (ach.status === 'locked') ach.status = 'available';
        });
      }
    });
  });
  saveData();
}

// Save to localStorage
function saveData() {
  localStorage.setItem('achievements_master', JSON.stringify(data));
}

// Render starry background
function renderStarryBg() {
  const canvas = document.getElementById('starry-bg');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.5})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderStarryBg(); // Re-render on resize
  });
}

// Render planets
function renderPlanets() {
  const numPlanets = data.planets.length;
  const angleStep = 360 / numPlanets;
  const planetsContainer = document.getElementById('planets');
  planetsContainer.innerHTML = '';
  data.planets.forEach((planet, index) => {
    const div = document.createElement('div');
    div.classList.add('planet');
    div.tabIndex = 0;
    div.ariaLabel = `Planet ${planet.planetName}`;
    const angle = angleStep * index * Math.PI / 180;
    div.style.left = `${50 + radius * Math.cos(angle)}%`;
    div.style.top = `${50 + radius * Math.sin(angle)}%`;
    div.innerHTML = `<img src="assets/core.png" alt="${planet.planetName}"><span>${planet.planetName}</span><svg class="rings"><circle cx="50%" cy="50%" r="60" fill="none" stroke="white" stroke-width="1" stroke-dasharray="5"></circle><circle cx="50%" cy="50%" r="80" fill="none" stroke="white" stroke-width="1" stroke-dasharray="5"></circle></svg>`;
    div.addEventListener('click', () => zoomToPlanet(index));
    div.addEventListener('mouseenter', playHover);
    planetsContainer.appendChild(div);
  });
}

// Render main branches with pulses
function renderBranches() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.width = '100%';
  svg.style.height = '100%';
  const numPlanets = data.planets.length;
  const angleStep = 360 / numPlanets;
  for (let i = 0; i < numPlanets; i++) {
    const angle = angleStep * i * Math.PI / 180;
    const endX = 50 + radius * Math.cos(angle);
    const endY = 50 + radius * Math.sin(angle);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M50 50 L${endX} ${endY}`);
    path.setAttribute('stroke', 'white');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    // Add 3 particles per path
    for (let j = 0; j < 3; j++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', Math.random() * 2 + 1);
      circle.setAttribute('fill', 'white');
      const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      anim.setAttribute('dur', `${Math.random() * 5 + 3}s`);
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('begin', `${Math.random() * 5}s`);
      anim.setAttribute('path', path.getAttribute('d'));
      circle.appendChild(anim);
      svg.appendChild(circle);
    }
  }
  document.getElementById('branches').appendChild(svg);
}

// Render junctions
function renderJunctions() {
  const junctionsContainer = document.getElementById('junctions');
  junctionsContainer.innerHTML = '';
  const numPlanets = data.planets.length;
  const angleStep = 360 / numPlanets;
  for (let i = 0; i < numPlanets - 1; i++) {
    const angle1 = angleStep * i * Math.PI / 180;
    const angle2 = angleStep * (i + 1) * Math.PI / 180;
    const midAngle = (angle1 + angle2) / 2;
    const midX = 50 + (radius / 2) * Math.cos(midAngle);
    const midY = 50 + (radius / 2) * Math.sin(midAngle);
    const div = document.createElement('div');
    div.classList.add('junction');
    const planet = data.planets[i];
    const allCompleted = planet.tiers.flatMap(t => t.achievements).every(a => a.status === 'completed');
    if (!allCompleted) div.classList.add('locked');
    div.innerHTML = `<img src="assets/junction.png" alt="Junction">`;
    div.style.left = `${midX}%`;
    div.style.top = `${midY}%`;
    junctionsContainer.appendChild(div);
  }
}

// Zoom to planet
function zoomToPlanet(index) {
  playHover(); // Use as click SFX
  selectedPlanetIndex = index;
  const angleStep = 360 / data.planets.length;
  const angle = angleStep * index * Math.PI / 180;
  const transX = - (radius * Math.cos(angle)) / scale * (scale - 1);
  const transY = - (radius * Math.sin(angle)) / scale * (scale - 1);
  document.getElementById('camera').style.transform = `translate(${transX}%, ${transY}%) scale(${scale})`;
  renderZoomPanel(index);
  renderPlanetNodes(index);
  document.getElementById('zoom-panel').classList.remove('hidden');
}

// Render zoom panel
function renderZoomPanel(index) {
  const tiersContainer = document.querySelector('.tiers');
  tiersContainer.innerHTML = '';
  const planet = data.planets[index];
  planet.tiers.forEach(tier => {
    const tierDiv = document.createElement('div');
    tierDiv.classList.add('tier');
    tierDiv.innerHTML = `<h3>${tier.tierName}</h3><p>${tier.description}</p>`;
    const achList = document.createElement('div');
    achList.classList.add('achievements');
    tier.achievements.forEach(ach => {
      const achDiv = document.createElement('div');
      achDiv.classList.add('achievement', ach.status);
      achDiv.innerHTML = `<span>${ach.title}</span>`;
      achDiv.tabIndex = 0;
      achDiv.ariaLabel = ach.title;
      achDiv.addEventListener('click', () => showDetail(ach));
      achDiv.addEventListener('mouseenter', playHover);
      achList.appendChild(achDiv);
    });
    tierDiv.appendChild(achList);
    tiersContainer.appendChild(tierDiv);
  });
}

// Render achievement nodes for zoomed planet
function renderPlanetNodes(index) {
  const nodesContainer = document.getElementById('nodes');
  nodesContainer.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.width = '100%';
  svg.style.height = '100%';
  const angleStep = 360 / data.planets.length;
  const angle = angleStep * index * Math.PI / 180;
  const planetX = 50 + radius * Math.cos(angle);
  const planetY = 50 + radius * Math.sin(angle);
  const planet = data.planets[index];
  planet.tiers.forEach((tier, tIndex) => {
    const tierRadius = nodeRadiusBase + tIndex * 5;
    const achAngleStep = 360 / tier.achievements.length;
    tier.achievements.forEach((ach, aIndex) => {
      const achAngle = achAngleStep * aIndex * Math.PI / 180;
      const nodeX = planetX + tierRadius * Math.cos(achAngle);
      const nodeY = planetY + tierRadius * Math.sin(achAngle);
      const div = document.createElement('div');
      div.classList.add('node', ach.status);
      div.tabIndex = 0;
      div.ariaLabel = ach.title;
      div.style.left = `${nodeX}%`;
      div.style.top = `${nodeY}%`;
      div.innerHTML = `<img src="assets/projector.png" alt="Achievement Node">` + (ach.status === 'locked' ? `<div class="overlay"><img src="assets/locked.png" alt="Locked"></div>` : '');
      div.addEventListener('click', () => showDetail(ach));
      div.addEventListener('mouseenter', (e) => showTooltip(e, ach.title));
      nodesContainer.appendChild(div);
      // Branch path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${planetX} ${planetY} L${nodeX} ${nodeY}`);
      path.setAttribute('stroke', 'white');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
      // Pulse (1 per path for performance)
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '1');
      circle.setAttribute('fill', 'white');
      const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      anim.setAttribute('dur', '4s');
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('path', path.getAttribute('d'));
      circle.appendChild(anim);
      svg.appendChild(circle);
    });
  });
  nodesContainer.appendChild(svg);
}

// Show detail overlay
function showDetail(ach) {
  if (ach.status !== 'available') return;
  document.getElementById('detail-title').textContent = ach.title;
  document.getElementById('detail-desc').textContent = ach.description;
  document.getElementById('detail-overlay').classList.remove('hidden');
  const completeBtn = document.getElementById('complete-btn');
  completeBtn.onclick = () => completeAchievement(ach);
  document.getElementById('close-btn').onclick = closeDetail;
}

// Complete achievement
function completeAchievement(ach) {
  ach.status = 'completed';
  ach.dateCompleted = new Date().toISOString();
  updateStatuses();
  closeDetail();
  if (selectedPlanetIndex !== -1) {
    renderZoomPanel(selectedPlanetIndex);
    renderPlanetNodes(selectedPlanetIndex);
    renderJunctions();
  }
}

// Close detail
function closeDetail() {
  document.getElementById('detail-overlay').classList.add('hidden');
}

// Zoom out
function zoomOut() {
  document.getElementById('camera').style.transform = 'scale(1) translate(0, 0)';
  document.getElementById('zoom-panel').classList.add('hidden');
  document.getElementById('nodes').innerHTML = '';
  selectedPlanetIndex = -1;
}

// Show tooltip
function showTooltip(e, text) {
  playHover();
  const tooltip = document.getElementById('tooltip');
  tooltip.textContent = text;
  tooltip.style.left = `${e.pageX + 10}px`;
  tooltip.style.top = `${e.pageY + 10}px`;
  tooltip.classList.remove('hidden');
  setTimeout(() => tooltip.classList.add('hidden'), 2000);
}

// Play hover sound
function playHover() {
  if (!muted) {
    hoverSfx.currentTime = 0;
    hoverSfx.play().catch(() => {});
  }
}

// Toggle mute
function toggleMute() {
  muted = !muted;
  bgMusic.muted = muted;
  hoverSfx.muted = muted;
  document.getElementById('mute-toggle').textContent = muted ? 'Unmute' : 'Mute';
}

// Keyboard handling
function handleKeyboard(e) {
  if (e.key === 'Escape') {
    if (!document.getElementById('detail-overlay').classList.contains('hidden')) closeDetail();
    else if (selectedPlanetIndex !== -1) zoomOut();
    else if (!document.getElementById('admin-panel').classList.contains('hidden')) closeAdmin();
  }
}

// Admin prompt
function promptAdmin() {
  const pass = prompt('Enter admin password:');
  if (pass === 'admin123') { // Change in code; insecure client-side
    openAdmin();
  } else {
    alert('Incorrect password');
  }
}

// Open admin
function openAdmin() {
  const panel = document.getElementById('admin-panel');
  panel.classList.remove('hidden');
  populateAdminSelects();
  document.getElementById('admin-close').onclick = closeAdmin;
  document.getElementById('admin-save-ach').onclick = saveAch;
  document.getElementById('admin-add-ach').onclick = addAch;
  document.getElementById('admin-remove-ach').onclick = removeAch;
  document.getElementById('admin-bulk-unlock-tier').onclick = bulkUnlockTier;
  document.getElementById('admin-bulk-reset-planet').onclick = bulkResetPlanet;
  document.getElementById('admin-download').onclick = downloadJson;
}

// Populate admin selects
function populateAdminSelects() {
  const planetSelect = document.getElementById('admin-planet');
  planetSelect.innerHTML = '';
  data.planets.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.text = p.planetName;
    planetSelect.appendChild(opt);
  });
  planetSelect.onchange = populateTierSelect;
  populateTierSelect();
}

// Populate tier select
function populateTierSelect() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierSelect = document.getElementById('admin-tier');
  tierSelect.innerHTML = '';
  data.planets[planetIndex].tiers.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.text = t.tierName;
    tierSelect.appendChild(opt);
  });
  tierSelect.onchange = populateAchSelect;
  populateAchSelect();
}

// Populate ach select
function populateAchSelect() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierIndex = document.getElementById('admin-tier').value;
  const achSelect = document.getElementById('admin-ach');
  achSelect.innerHTML = '';
  data.planets[planetIndex].tiers[tierIndex].achievements.forEach((a, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.text = a.title;
    achSelect.appendChild(opt);
  });
  achSelect.onchange = loadAchData;
  loadAchData();
}

// Load ach data into inputs
function loadAchData() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierIndex = document.getElementById('admin-tier').value;
  const achIndex = document.getElementById('admin-ach').value;
  const ach = data.planets[planetIndex].tiers[tierIndex].achievements[achIndex];
  document.getElementById('admin-title').value = ach.title;
  document.getElementById('admin-desc').value = ach.description;
  document.getElementById('admin-status').value = ach.status;
}

// Save ach
function saveAch() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierIndex = document.getElementById('admin-tier').value;
  const achIndex = document.getElementById('admin-ach').value;
  const ach = data.planets[planetIndex].tiers[tierIndex].achievements[achIndex];
  ach.title = document.getElementById('admin-title').value;
  ach.description = document.getElementById('admin-desc').value;
  ach.status = document.getElementById('admin-status').value;
  if (ach.status === 'completed') ach.dateCompleted = new Date().toISOString();
  updateStatuses();
  populateAdminSelects(); // Refresh
  if (selectedPlanetIndex !== -1) renderZoomPanel(selectedPlanetIndex);
}

// Add new ach
function addAch() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierIndex = document.getElementById('admin-tier').value;
  const newAch = {
    id: `new_${Date.now()}`,
    title: 'New Achievement',
    description: 'Description',
    planet: data.planets[planetIndex].planetName,
    tier: data.planets[planetIndex].tiers[tierIndex].tierNumber,
    status: 'locked',
    dateCompleted: null
  };
  data.planets[planetIndex].tiers[tierIndex].achievements.push(newAch);
  saveData();
  populateAdminSelects();
}

// Remove ach
function removeAch() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierIndex = document.getElementById('admin-tier').value;
  const achIndex = document.getElementById('admin-ach').value;
  data.planets[planetIndex].tiers[tierIndex].achievements.splice(achIndex, 1);
  saveData();
  populateAdminSelects();
}

// Bulk unlock tier
function bulkUnlockTier() {
  const planetIndex = document.getElementById('admin-planet').value;
  const tierIndex = document.getElementById('admin-tier').value;
  data.planets[planetIndex].tiers[tierIndex].achievements.forEach(ach => ach.status = 'available');
  saveData();
  populateAdminSelects();
}

// Bulk reset planet
function bulkResetPlanet() {
  const planetIndex = document.getElementById('admin-planet').value;
  data.planets[planetIndex].tiers.forEach(tier => {
    tier.achievements.forEach(ach => {
      ach.status = tier.tierNumber === 1 ? 'available' : 'locked';
      ach.dateCompleted = null;
    });
  });
  saveData();
  populateAdminSelects();
}

// Download JSON
function downloadJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'achievements.json';
  a.click();
}

// Close admin
function closeAdmin() {
  document.getElementById('admin-panel').classList.add('hidden');
}

init();
