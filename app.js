// app.js - v2
const ASSETS = {
  coreImage: "https://files.catbox.moe/b0zug5.png",
  projectorImage: "https://files.catbox.moe/i76wxr.png",
  lockedOverlay: "https://files.catbox.moe/2tciqz.png",
  hoverSound: "https://files.catbox.moe/kftxci.mp3",
  bgMusic: "https://files.catbox.moe/ej4uff.mp3",
  junctionIcon: "https://files.catbox.moe/z7t4yb.png"
};

let data = null;
const config = { coreCount: 5, orbitRadius: 260, coreSize: 96 };

async function loadData(){
  // prefer localStorage if admin saved changes
  const saved = localStorage.getItem('achievements_master');
  if(saved){
    try{ const parsed = JSON.parse(saved); data = parsed; init(); return; }catch(e){ console.warn("saved JSON parse error", e); }
  }
  try{
    const res = await fetch('achievements.json');
    data = await res.json();
    init();
  }catch(e){
    console.error("Failed to load achievements.json", e);
    data = { planets: [] };
    init();
  }
}

function init(){
  createOrbitsAndCores();
  setupAudio();
  setupAdmin();
  window.addEventListener('resize', ()=>{ document.getElementById('orbits').innerHTML=''; document.getElementById('branches').innerHTML=''; document.getElementById('planets').innerHTML=''; document.getElementById('junctions').innerHTML=''; createOrbitsAndCores(); });
}

function setupAudio(){
  const bg = document.getElementById('bg-music');
  bg.src = ASSETS.bgMusic;
  function playOnFirst(){ bg.play().catch(()=>{}); window.removeEventListener('click', playOnFirst); }
  window.addEventListener('click', playOnFirst);
}

function createOrbitsAndCores(){
  const svg = document.getElementById('orbits');
  const branches = document.getElementById('branches');
  const planetsLayer = document.getElementById('planets');
  const junctionsLayer = document.getElementById('junctions');
  const center = { x: window.innerWidth/2, y: window.innerHeight/2 };
  const coreCount = Math.min(config.coreCount, data.planets.length);
  const angleStep = (Math.PI*2)/coreCount;

  for(let i=0;i<coreCount;i++){
    const angle = i*angleStep - Math.PI/2;
    const x = center.x + Math.cos(angle)*config.orbitRadius;
    const y = center.y + Math.sin(angle)*config.orbitRadius;

    // orbit circle
    const orbit = document.createElementNS('http://www.w3.org/2000/svg','circle');
    orbit.setAttribute('cx', center.x);
    orbit.setAttribute('cy', center.y);
    orbit.setAttribute('r', config.orbitRadius);
    orbit.setAttribute('fill','none');
    orbit.setAttribute('stroke','rgba(255,255,255,0.04)');
    orbit.setAttribute('stroke-width','1');
    svg.appendChild(orbit);

    // branch path from center to core (quadratic)
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const cx = center.x, cy = center.y;
    const ctrlx = (cx + x)/2 + (Math.sin(angle)*60);
    const ctrly = (cy + y)/2 + (Math.cos(angle)*-60);
    const d = `M ${cx} ${cy} Q ${ctrlx} ${ctrly} ${x} ${y}`;
    path.setAttribute('d', d);
    path.setAttribute('class','pulse-path');
    branches.appendChild(path);

    // add pulsing dot along path using animateMotion
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('r','3.2');
    dot.setAttribute('class','pulse-dot');
    const m = document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
    m.setAttribute('dur','3s');
    m.setAttribute('repeatCount','indefinite');
    const mpath = document.createElementNS('http://www.w3.org/2000/svg','mpath');
    mpath.setAttributeNS('http://www.w3.org/1999/xlink','href','#path-' + i);
    // to reference, set id on path
    path.setAttribute('id','path-' + i);
    m.appendChild(mpath);
    dot.appendChild(m);
    branches.appendChild(dot);

    // create core element
    const p = document.createElement('div');
    p.className = 'planet';
    p.style.left = (x - config.coreSize/2) + 'px';
    p.style.top = (y - config.coreSize/2) + 'px';
    p.style.width = config.coreSize + 'px';
    p.style.height = config.coreSize + 'px';
    p.dataset.planetIndex = i;
    const img = document.createElement('img');
    img.src = ASSETS.coreImage;
    img.alt = data.planets[i].planetName || 'Core';
    p.appendChild(img);
    const hr = document.createElement('div');
    hr.className = 'hover-rings';
    p.appendChild(hr);
    planetsLayer.appendChild(p);

    p.addEventListener('mouseenter', ()=>{ p.classList.add('hovered'); playHoverSound(); showTooltip(data.planets[i].planetName); });
    p.addEventListener('mouseleave', ()=>{ p.classList.remove('hovered'); hideTooltip(); });
    p.addEventListener('click', (e)=>{ e.stopPropagation(); zoomToCore(i); playClickSound(); });

    // junction icon between this core and next (midpoint)
    const nextIdx = (i+1)%coreCount;
    const midx = (x + center.x)/2 + Math.cos(angle)*40;
    const midy = (y + center.y)/2 + Math.sin(angle)*40;
    const j = document.createElement('img');
    j.className = 'junction';
    j.style.left = midx + 'px';
    j.style.top = midy + 'px';
    j.src = ASSETS.junctionIcon;
    j.alt = 'junction';
    // check unlocked status: unlocked if entire planet i achieved (all achievements completed)
    const planetObj = data.planets[i];
    const allDone = isPlanetComplete(planetObj);
    j.classList.add(allDone ? 'unlocked' : 'locked');
    junctionsLayer.appendChild(j);
  }
}

function isPlanetComplete(planetObj){
  for(const tier of planetObj.tiers){
    for(const a of tier.achievements){
      if(a.status !== 'completed') return false;
    }
  }
  return true;
}

// camera pan & zoom
let currentZoom = null;
function zoomToCore(index){
  const planets = document.querySelectorAll('.planet');
  const p = planets[index];
  const rect = p.getBoundingClientRect();
  const cx = window.innerWidth/2, cy = window.innerHeight/2;
  const tx = (cx - (rect.left + rect.width/2));
  const ty = (cy - (rect.top + rect.height/2));
  const scale = 1.8;
  const cam = document.getElementById('camera');
  cam.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  currentZoom = index;
  openZoomPanel(index);
}

document.getElementById('zoom-close').addEventListener('click', ()=>{ resetCamera(); });

function resetCamera(){
  const cam = document.getElementById('camera');
  cam.style.transform = '';
  currentZoom = null;
  closeZoomPanel();
}

function openZoomPanel(index){
  const panel = document.getElementById('zoom-panel');
  panel.classList.remove('hidden');
  const title = document.getElementById('cluster-title');
  title.textContent = data.planets[index].planetName;
  const container = document.getElementById('tiers-container');
  container.innerHTML = '';
  // show tiers horizontally with scroll, each tier shows list of achievements (scroll in panel)
  for(const tier of data.planets[index].tiers){
    const tierDiv = document.createElement('div');
    tierDiv.className = 'tier';
    const h = document.createElement('h3'); h.textContent = `Tier ${tier.tierNumber} - ${tier.tierName}`;
    const p = document.createElement('p'); p.textContent = tier.description;
    tierDiv.appendChild(h); tierDiv.appendChild(p);
    for(const a of tier.achievements){
      const achEl = document.createElement('div'); achEl.className = 'achievement';
      const left = document.createElement('div'); left.style.width='10px';
      const info = document.createElement('div');
      const t = document.createElement('div'); t.className='ach-title'; t.textContent = a.title;
      const d = document.createElement('div'); d.className='ach-desc'; d.textContent = a.description;
      info.appendChild(t); info.appendChild(d);
      const btn = document.createElement('button'); btn.textContent = (a.status==='completed') ? 'Completed' : (a.status==='locked' ? 'Locked' : 'Complete');
      btn.disabled = (a.status==='locked' || a.status==='completed');
      btn.addEventListener('click', ()=>{ markComplete(index, tier.tierNumber, a.id); btn.disabled=true; btn.textContent='Completed'; achEl.style.opacity=0.6; });
      achEl.appendChild(left); achEl.appendChild(info); achEl.appendChild(btn);
      tierDiv.appendChild(achEl);
    }
    container.appendChild(tierDiv);
  }
}

function closeZoomPanel(){ document.getElementById('zoom-panel').classList.add('hidden'); }

function markComplete(planetIndex, tierNumber, id){
  const planet = data.planets[planetIndex];
  for(const tier of planet.tiers){
    for(const a of tier.achievements){
      if(a.id === id){
        a.status = 'completed';
        a.dateCompleted = new Date().toISOString();
      }
    }
  }
  // if entire tier completed, unlock next tier in same planet
  const tier = planet.tiers.find(t=>t.tierNumber===tierNumber);
  if(tier){
    const all = tier.achievements.every(x=>x.status==='completed');
    if(all){
      const next = planet.tiers.find(t=>t.tierNumber===tierNumber+1);
      if(next){ next.achievements.forEach(a=>{ if(a.status==='locked') a.status='available'; }) }
    }
  }
  // persist
  localStorage.setItem('achievements_master', JSON.stringify(data, null, 2));
  // refresh junctions/unlocked visuals
  document.getElementById('junctions').innerHTML='';
  // redraw junctions simple way: clear and recreate or just call createOrbitsAndCores on resize
  document.getElementById('orbits').innerHTML='';
  document.getElementById('branches').innerHTML='';
  document.getElementById('planets').innerHTML='';
  document.getElementById('junctions').innerHTML='';
  createOrbitsAndCores();
  // refresh panel
  if(currentZoom!==null) openZoomPanel(currentZoom);
}

function playHoverSound(){ const s = new Audio(ASSETS.hoverSound); s.volume=0.5; s.play().catch(()=>{}); }
function playClickSound(){ const s = new Audio(ASSETS.hoverSound); s.volume=0.6; s.play().catch(()=>{}); }
function showTooltip(text){ let tt = document.querySelector('.tooltip'); if(!tt){ tt = document.createElement('div'); tt.className='tooltip'; document.body.appendChild(tt);} tt.textContent = text; tt.style.display='block'; document.addEventListener('mousemove', moveTooltip); }
function moveTooltip(e){ const tt = document.querySelector('.tooltip'); if(!tt) return; tt.style.left = (e.clientX+12)+'px'; tt.style.top = (e.clientY+12)+'px'; }
function hideTooltip(){ const tt = document.querySelector('.tooltip'); if(tt) tt.style.display='none'; document.removeEventListener('mousemove', moveTooltip); }

// ADMIN UI (client-side): unlock with simple password, edit achievements, save to localStorage and download
function setupAdmin(){
  const openBtn = document.getElementById('open-admin');
  const modal = document.getElementById('admin-modal');
  const login = document.getElementById('admin-login');
  const editor = document.getElementById('admin-editor');
  const unlockBtn = document.getElementById('admin-unlock');
  const passInput = document.getElementById('admin-pass');
  openBtn.addEventListener('click', ()=>{ modal.classList.remove('hidden'); });
  document.getElementById('admin-close').addEventListener('click', ()=>{ modal.classList.add('hidden'); });

  unlockBtn.addEventListener('click', ()=>{
    if(passInput.value === 'letmein'){ // replace with your chosen client-side password
      login.classList.add('hidden');
      editor.classList.remove('hidden');
      populateAdminList();
    } else { alert('Wrong password (client-side)'); }
  });

  document.getElementById('admin-save').addEventListener('click', ()=>{
    // read modified entries from DOM and save to localStorage
    const edited = gatherAdminEdits();
    if(edited){ localStorage.setItem('achievements_master', JSON.stringify(edited, null, 2)); alert('Saved to localStorage.'); data = edited; document.getElementById('orbits').innerHTML=''; document.getElementById('branches').innerHTML=''; document.getElementById('planets').innerHTML=''; document.getElementById('junctions').innerHTML=''; createOrbitsAndCores(); }
  });
  document.getElementById('admin-download').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='achievements_export.json'; a.click(); URL.revokeObjectURL(url);
  });
}

function populateAdminList(){
  const list = document.getElementById('admin-list');
  list.innerHTML = '';
  // create simple editors per planet -> tier -> achievements count
  data.planets.forEach((p, pi)=>{
    const pdiv = document.createElement('div'); pdiv.style.borderTop='1px solid rgba(255,255,255,0.04)'; pdiv.style.padding='8px 0';
    const ph = document.createElement('h4'); ph.textContent = p.planetName; pdiv.appendChild(ph);
    p.tiers.forEach((t, ti)=>{
      const th = document.createElement('div'); th.textContent = `Tier ${t.tierNumber} - ${t.tierName}`; th.style.fontWeight='600'; pdiv.appendChild(th);
      t.achievements.forEach((a, ai)=>{
        const row = document.createElement('div'); row.style.display='flex'; row.style.gap='6px'; row.style.margin='6px 0';
        const id = document.createElement('input'); id.value=a.id; id.style.width='220px';
        const title = document.createElement('input'); title.value=a.title; title.style.flex='1';
        const status = document.createElement('select'); ['locked','available','completed'].forEach(s=>{ const o = document.createElement('option'); o.value=s; o.text=s; if(a.status===s) o.selected=true; status.appendChild(o); });
        row.appendChild(id); row.appendChild(title); row.appendChild(status);
        pdiv.appendChild(row);
      });
    });
    list.appendChild(pdiv);
  });
}

function gatherAdminEdits(){
  // Instead of reconstructing DOM edits, simply return `data` (admin edits not applied in-place in this simple editor).
  // For a full editor we'd sync each input; to keep this safe and quick we present the existing data and allow JSON download.
  return data;
}

// start
loadData();
