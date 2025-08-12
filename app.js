// app.js - Final build
const ASSETS = {
  coreImage: "https://files.catbox.moe/b0zug5.png",
  projectorImage: "https://files.catbox.moe/i76wxr.png",
  availableOverlay: "https://files.catbox.moe/2tciqz.png",
  lockedIcon: "https://files.catbox.moe/jbhsjx.png",
  hoverSound: "https://files.catbox.moe/kftxci.mp3",
  bgMusic: "https://files.catbox.moe/ej4uff.mp3",
  junctionIcon: "https://files.catbox.moe/z7t4yb.png"
};

let DATA = null;
let CONFIG = { orbitRadius:260, coreSize:96, rotationSpeed:40, pulseSpeed:3, zoomScale:1.9 };

async function loadJSON(path){
  const res = await fetch(path);
  return await res.json();
}

async function init(){
  try{ const c = await loadJSON('config.json'); Object.assign(CONFIG, c); }catch(e){ console.warn('No config.json'); }
  const saved = localStorage.getItem('achievements_master');
  if(saved){ try{ DATA = JSON.parse(saved); }catch(e){ console.warn('saved parse err',e); } }
  if(!DATA){
    try{ DATA = await loadJSON('achievements.json'); }catch(e){ console.error('Failed to load achievements.json', e); DATA = { planets: [] }; }
  }
  buildScene();
  setupAudio();
  setupAdmin();
  window.addEventListener('resize', ()=>{ rebuildScene(); });
}

function setupAudio(){
  const bg = document.getElementById('bg-music');
  bg.src = ASSETS.bgMusic;
  function playOnFirst(){ bg.play().catch(()=>{}); window.removeEventListener('click', playOnFirst); }
  window.addEventListener('click', playOnFirst);
}

function rebuildScene(){
  document.getElementById('orbits').innerHTML='';
  document.getElementById('branches').innerHTML='';
  document.getElementById('planets').innerHTML='';
  document.getElementById('junctions').innerHTML='';
  buildScene();
}

function buildScene(){
  const center = { x: window.innerWidth/2, y: window.innerHeight/2 };
  const coreCount = Math.min(5, DATA.planets.length);
  const angleStep = (Math.PI*2)/coreCount;
  const orbitSvg = document.getElementById('orbits');
  const branchesSvg = document.getElementById('branches');
  const planetsLayer = document.getElementById('planets');
  const junctionsLayer = document.getElementById('junctions');

  const centerLines = document.getElementById('center-lines');
  centerLines.innerHTML = '';
  for(let i=0;i<6;i++){
    const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
    const a = (i/6)*Math.PI*2;
    const r = 140 + (i*8);
    ln.setAttribute('x1', center.x);
    ln.setAttribute('y1', center.y);
    ln.setAttribute('x2', center.x + Math.cos(a)*r);
    ln.setAttribute('y2', center.y + Math.sin(a)*r);
    ln.setAttribute('stroke','rgba(255,255,255,0.03)');
    ln.setAttribute('stroke-width','1');
    ln.setAttribute('opacity',0.6);
    centerLines.appendChild(ln);
  }

  for(let i=0;i<coreCount;i++){
    const angle = i*angleStep - Math.PI/2;
    const x = center.x + Math.cos(angle)*CONFIG.orbitRadius;
    const y = center.y + Math.sin(angle)*CONFIG.orbitRadius;

    const orbit1 = document.createElementNS('http://www.w3.org/2000/svg','circle');
    orbit1.setAttribute('cx', center.x);
    orbit1.setAttribute('cy', center.y);
    orbit1.setAttribute('r', CONFIG.orbitRadius);
    orbit1.setAttribute('fill','none');
    orbit1.setAttribute('stroke','rgba(255,255,255,0.04)');
    orbit1.setAttribute('stroke-width','1');
    orbitSvg.appendChild(orbit1);

    const orbit2 = document.createElementNS('http://www.w3.org/2000/svg','circle');
    orbit2.setAttribute('cx', center.x);
    orbit2.setAttribute('cy', center.y);
    orbit2.setAttribute('r', CONFIG.orbitRadius+12);
    orbit2.setAttribute('fill','none');
    orbit2.setAttribute('stroke','rgba(255,255,255,0.03)');
    orbit2.setAttribute('stroke-width','1');
    orbitSvg.appendChild(orbit2);

    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const ctrlx = (center.x + x)/2 + (Math.sin(angle)*60);
    const ctrly = (center.y + y)/2 + (Math.cos(angle)*-60);
    const d = `M ${center.x} ${center.y} Q ${ctrlx} ${ctrly} ${x} ${y}`;
    path.setAttribute('d', d);
    path.setAttribute('class','pulse-path');
    path.setAttribute('id','path-core-'+i);
    branchesSvg.appendChild(path);

    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('r','3.2');
    dot.setAttribute('class','pulse-dot');
    const anim = document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
    anim.setAttribute('dur', CONFIG.pulseSpeed + 's');
    anim.setAttribute('repeatCount','indefinite');
    const mpath = document.createElementNS('http://www.w3.org/2000/svg','mpath');
    mpath.setAttributeNS('http://www.w3.org/1999/xlink','href','#path-core-'+i);
    anim.appendChild(mpath);
    dot.appendChild(anim);
    branchesSvg.appendChild(dot);

    const p = document.createElement('div');
    p.className = 'planet';
    p.style.left = (x - CONFIG.coreSize/2) + 'px';
    p.style.top = (y - CONFIG.coreSize/2) + 'px';
    p.style.width = CONFIG.coreSize + 'px';
    p.style.height = CONFIG.coreSize + 'px';
    p.dataset.planetIndex = i;
    const img = document.createElement('img'); img.src = ASSETS.coreImage; img.alt = DATA.planets[i].planetName || 'Core';
    p.appendChild(img);
    const hr = document.createElement('div'); hr.className='hover-rings';
    hr.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.2" /><circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.2" /></svg>';
    p.appendChild(hr);
    planetsLayer.appendChild(p);

    p.addEventListener('mouseenter', ()=>{ p.classList.add('hovered'); playHoverSound(); showTooltip(DATA.planets[i].planetName); });
    p.addEventListener('mouseleave', ()=>{ p.classList.remove('hovered'); hideTooltip(); });
    p.addEventListener('click', (e)=>{ e.stopPropagation(); zoomToCore(i); playClickSound(); });

    const planetObj = DATA.planets[i];
    for(let t=0;t<planetObj.tiers.length;t++){
      const tier = planetObj.tiers[t];
      const topics = Math.min(6, Math.ceil(tier.achievements.length / 4)); 
      for(let c=0;c<topics;c++){
        const theta = (c / topics) * Math.PI*2 + (t*0.3);
        const radius = 60 + (t*28) + (c%2?6:0);
        const nx = x + Math.cos(theta)*radius;
        const ny = y + Math.sin(theta)*radius;
        const cid = `path-${i}-t${t}-c${c}`;
        const cp = document.createElementNS('http://www.w3.org/2000/svg','path');
        const cctrlx = (x + nx)/2 + Math.sin(theta)*20;
        const cctrly = (y + ny)/2 - Math.cos(theta)*20;
        const cd = `M ${x} ${y} Q ${cctrlx} ${cctrly} ${nx} ${ny}`;
        cp.setAttribute('d', cd);
        cp.setAttribute('class','pulse-path');
        cp.setAttribute('id', cid);
        branchesSvg.appendChild(cp);

        const cdot = document.createElementNS('http://www.w3.org/2000/svg','circle');
        cdot.setAttribute('r','2.5');
        cdot.setAttribute('class','pulse-dot');
        const canim = document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
        canim.setAttribute('dur', (CONFIG.pulseSpeed + t*0.6) + 's');
        canim.setAttribute('repeatCount','indefinite');
        const cmpath = document.createElementNS('http://www.w3.org/1999/xlink','href');
        const cmp = document.createElementNS('http://www.w3.org/2000/svg','mpath');
        cmp.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+cid);
        canim.appendChild(cmp);
        cdot.appendChild(canim);
        branchesSvg.appendChild(cdot);

        const clusterDiv = document.createElement('div');
        clusterDiv.className = 'cluster';
        clusterDiv.style.position = 'absolute';
        clusterDiv.style.left = (nx - 24) + 'px';
        clusterDiv.style.top = (ny - 24) + 'px';
        clusterDiv.style.width = '48px';
        clusterDiv.style.height = '48px';
        clusterDiv.style.pointerEvents = 'none';
        clusterDiv.dataset.planet = i;
        clusterDiv.dataset.tier = t+1;
        clusterDiv.dataset.cluster = c;
        planetsLayer.appendChild(clusterDiv);
      }
    }

    const midx = (x + center.x)/2 + Math.cos(angle)*40;
    const midy = (y + center.y)/2 + Math.sin(angle)*40;
    const j = document.createElement('img');
    j.className = 'junction';
    j.style.left = midx + 'px';
    j.style.top = midy + 'px';
    j.src = ASSETS.junctionIcon;
    j.alt = 'junction';
    const planetComplete = isPlanetComplete(planetObj);
    if(planetComplete) j.classList.add('unlocked'); else j.classList.add('locked');
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

let currentZoom = null;
function zoomToCore(idx){
  const cores = document.querySelectorAll('.planet');
  const p = cores[idx];
  const rect = p.getBoundingClientRect();
  const cx = window.innerWidth/2, cy = window.innerHeight/2;
  const tx = (cx - (rect.left + rect.width/2));
  const ty = (cy - (rect.top + rect.height/2));
  const scale = CONFIG.zoomScale;
  const cam = document.getElementById('camera');
  cam.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  currentZoom = idx;
  openZoomPanel(idx);
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
  title.textContent = DATA.planets[index].planetName;
  const container = document.getElementById('tiers-container');
  container.innerHTML = '';
  const planet = DATA.planets[index];
  for(const tier of planet.tiers){
    const tierDiv = document.createElement('div'); tierDiv.className='tier';
    const h = document.createElement('h3'); h.textContent = `Tier ${tier.tierNumber} - ${tier.tierName}`;
    const p = document.createElement('p'); p.textContent = tier.description;
    tierDiv.appendChild(h); tierDiv.appendChild(p);
    for(const a of tier.achievements){
      const achEl = document.createElement('div'); achEl.className='achievement';
      const left = document.createElement('div'); left.style.width='56px';
      const wrap = document.createElement('div'); wrap.className='node-wrap';
      const img = document.createElement('img'); img.className='node-img'; img.src = ASSETS.projectorImage;
      const overlay = document.createElement('div'); overlay.className='node-overlay';
      const overImg = document.createElement('img'); overImg.className='node-lock';
      if(a.status === 'locked'){ overImg.src = ASSETS.lockedIcon; overImg.style.opacity = '0.9'; }
      else if(a.status === 'available'){ overImg.src = ASSETS.availableOverlay; overImg.style.opacity = '0.95'; overImg.style.animation = 'heartbeat 1.4s infinite'; }
      else { overImg.style.display = 'none'; }
      overlay.appendChild(overImg);
      wrap.appendChild(img); wrap.appendChild(overlay);
      left.appendChild(wrap);

      const info = document.createElement('div');
      const t = document.createElement('div'); t.className='ach-title'; t.textContent = a.title;
      const d = document.createElement('div'); d.className='ach-desc'; d.textContent = a.description;
      info.appendChild(t); info.appendChild(d);

      const btn = document.createElement('button');
      btn.textContent = (a.status === 'completed') ? 'Completed' : (a.status === 'locked' ? 'Locked' : 'Complete');
      btn.disabled = (a.status === 'locked' || a.status === 'completed');
      btn.addEventListener('click', ()=>{ markComplete(index, tier.tierNumber, a.id); });

      achEl.appendChild(left); achEl.appendChild(info); achEl.appendChild(btn);
      tierDiv.appendChild(achEl);
    }
    container.appendChild(tierDiv);
  }
}

function closeZoomPanel(){ document.getElementById('zoom-panel').classList.add('hidden'); }

function markComplete(planetIndex, tierNumber, id){
  const planet = DATA.planets[planetIndex];
  for(const tier of planet.tiers){
    for(const a of tier.achievements){
      if(a.id === id){
        a.status = 'completed';
        a.dateCompleted = new Date().toISOString();
      }
    }
  }
  const tier = planet.tiers.find(t=>t.tierNumber===tierNumber);
  if(tier){
    const all = tier.achievements.every(x=>x.status==='completed');
    if(all){
      const next = planet.tiers.find(t=>t.tierNumber===tierNumber+1);
      if(next){ next.achievements.forEach(a=>{ if(a.status==='locked') a.status='available'; }) }
    }
  }
  localStorage.setItem('achievements_master', JSON.stringify(DATA, null, 2));
  rebuildScene();
  if(currentZoom!==null) openZoomPanel(currentZoom);
}

function playHoverSound(){ const s = new Audio(ASSETS.hoverSound); s.volume=0.5; s.play().catch(()=>{}); }
function playClickSound(){ const s = new Audio(ASSETS.hoverSound); s.volume=0.6; s.play().catch(()=>{}); }

function showTooltip(text){ let tt = document.querySelector('.tooltip'); if(!tt){ tt = document.createElement('div'); tt.className='tooltip'; document.body.appendChild(tt);} tt.textContent = text; tt.style.display='block'; document.addEventListener('mousemove', moveTooltip); }
function moveTooltip(e){ const tt = document.querySelector('.tooltip'); if(!tt) return; tt.style.left = (e.clientX+12)+'px'; tt.style.top = (e.clientY+12)+'px'; }
function hideTooltip(){ const tt = document.querySelector('.tooltip'); if(tt) tt.style.display='none'; document.removeEventListener('mousemove', moveTooltip); }

function setupAdmin(){
  const openBtn = document.getElementById('open-admin');
  const modal = document.getElementById('admin-modal');
  const login = document.getElementById('admin-login');
  const editor = document.getElementById('admin-editor');
  const unlockBtn = document.getElementById('admin-unlock');
  const passInput = document.getElementById('admin-pass');
  const jsonArea = document.getElementById('admin-json');

  openBtn.addEventListener('click', ()=>{ modal.classList.remove('hidden'); });
  document.getElementById('admin-close').addEventListener('click', ()=>{ modal.classList.add('hidden'); });

  unlockBtn.addEventListener('click', ()=>{
    if(passInput.value === 'letmein'){ login.classList.add('hidden'); editor.classList.remove('hidden'); jsonArea.value = JSON.stringify(DATA, null, 2); }
    else alert('Wrong password (client-side)');
  });

  document.getElementById('admin-save').addEventListener('click', ()=>{
    try{
      const parsed = JSON.parse(jsonArea.value);
      DATA = parsed;
      localStorage.setItem('achievements_master', JSON.stringify(DATA, null, 2));
      alert('Saved to localStorage.');
      rebuildScene();
    }catch(e){ alert('Invalid JSON: ' + e.message); }
  });

  document.getElementById('admin-download').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'achievements_export.json'; a.click(); URL.revokeObjectURL(url);
  });

  document.getElementById('admin-load').addEventListener('click', ()=>{ jsonArea.value = JSON.stringify(DATA, null, 2); alert('Reloaded current data into editor.'); });
  document.getElementById('admin-bulk-unlock').addEventListener('click', ()=>{
    for(const planet of DATA.planets){
      for(let i=0;i<planet.tiers.length-1;i++){
        const all = planet.tiers[i].achievements.every(x=>x.status==='completed');
        if(all){ planet.tiers[i+1].achievements.forEach(a=>{ if(a.status==='locked') a.status='available'; }); }
      }
    }
    localStorage.setItem('achievements_master', JSON.stringify(DATA, null, 2));
    jsonArea.value = JSON.stringify(DATA, null, 2);
    rebuildScene();
    alert('Bulk unlock applied where tiers were complete.');
  });
  document.getElementById('admin-reset').addEventListener('click', ()=>{
    if(confirm('Reset all progress? This will set all achievements to locked except tier1 available.')){
      for(const planet of DATA.planets){
        for(const tier of planet.tiers){
          for(const a of tier.achievements){
            a.status = (tier.tierNumber===1 ? 'available' : 'locked');
            a.dateCompleted = null;
          }
        }
      }
      localStorage.setItem('achievements_master', JSON.stringify(DATA, null, 2));
      jsonArea.value = JSON.stringify(DATA, null, 2);
      rebuildScene();
      alert('Reset complete.');
    }
  });
}

init();
