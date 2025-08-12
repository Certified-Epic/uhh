// app.js - Mobile-friendly non-spinning star chart with 25 planets and junctions
const ASSETS = {};
async function loadConfig(){ try{ const res = await fetch('config.json'); const c = await res.json(); Object.assign(ASSETS, c); }catch(e){ console.warn('config not found'); } }
let DATA = null;

// Generate 25 placeholder planets with small sample achievements
function generateData(){
  const planets = [];
  const names = ["Sol","Astra","Nexus","Vela","Orbis","Nyx","Eos","Tethys","Kairo","Zenith","Aurora","Drift","Halo","Vortex","Seraph","Rune","Echo","Pioneer","Atlas","Sable","Lyra","Quanta","Mira","Corona","Aria"];
  for(let i=0;i<25;i++){
    const tiers = [];
    for(let t=1;t<=5;t++){
      const achs = [];
      for(let a=1;a<=5;a++){
        achs.push({
          id: `p${i+1}_t${t}_a${a}`,
          title: `${names[i]} T${t} - Ach ${a}`,
          description: `Sample achievement ${a} on tier ${t} of ${names[i]}.`,
          planet: names[i],
          tier: t,
          status: (t===1 ? (a<=2 ? 'available' : 'available') : 'locked'),
          dateCompleted: null
        });
      }
      tiers.push({ tierNumber: t, tierName: `Tier ${t}`, description: `Tier ${t} description`, achievements: achs });
    }
    planets.push({ planetName: names[i], description: `${names[i]} planet`, tiers });
  }
  DATA = { planets };
}

// Scene build
function buildScene(){
  const center = { x: 1000, y: 600 }; // scene coords
  const scene = document.getElementById('scene');
  const planetsLayer = document.getElementById('planets');
  const svg = document.getElementById('svg-layer');
  const junctionsLayer = document.getElementById('junctions');
  planetsLayer.innerHTML=''; svg.innerHTML=''; junctionsLayer.innerHTML='';
  // place planets in three rings to mimic screenshot: inner 5, middle 10, outer 10
  const rings = [{count:5,r:240},{count:10,r:420},{count:10,r:620}];
  let idx = 0;
  for(const ring of rings){
    for(let k=0;k<ring.count;k++){
      if(idx>=DATA.planets.length) break;
      const angle = (k / ring.count) * Math.PI*2 - Math.PI/2 + (idx*0.05);
      const x = center.x + Math.cos(angle)*ring.r;
      const y = center.y + Math.sin(angle)*ring.r;
      createPlanet(idx, x, y);
      idx++;
    }
  }
  // create linear junctions: connect planets sequentially and some cross-links
  for(let i=0;i<DATA.planets.length;i++){
    const a = document.querySelector(`.planet[data-index='${i}']`);
    if(!a) continue;
    const rectA = a.getBoundingClientRect();
    const ax = parseFloat(a.dataset.cx), ay = parseFloat(a.dataset.cy);
    // connect to next
    const ni = (i+1)%DATA.planets.length;
    const b = document.querySelector(`.planet[data-index='${ni}']`);
    if(b){
      const bx = parseFloat(b.dataset.cx), by = parseFloat(b.dataset.cy);
      drawJunction(ax,ay,bx,by);
    }
    // occasional cross link (every 4th)
    if(i%4===0){
      const ci = (i+5)%DATA.planets.length;
      const c = document.querySelector(`.planet[data-index='${ci}']`);
      if(c){
        const cx = parseFloat(c.dataset.cx), cy = parseFloat(c.dataset.cy);
        drawJunction(ax,ay,cx,cy,true);
      }
    }
  }
  // set center image
  const centerImg = document.getElementById('center-img');
  centerImg.src = ASSETS.centerImage || '';
}

// createPlanet helper
function createPlanet(i,x,y){
  const planetsLayer = document.getElementById('planets');
  const el = document.createElement('div');
  el.className = 'planet';
  el.dataset.index = i;
  el.dataset.cx = x; el.dataset.cy = y;
  el.style.left = (x-42) + 'px';
  el.style.top = (y-42) + 'px';
  const img = document.createElement('img'); img.src = ASSETS.coreImage || ''; img.alt = DATA.planets[i].planetName;
  el.appendChild(img);
  const ring = document.createElement('div'); ring.className='ring'; el.appendChild(ring);
  planetsLayer.appendChild(el);
  el.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); onPlanetPointerDown(e, i); });
  el.addEventListener('mouseenter', ()=>{ el.classList.add('hovered'); showTooltip(DATA.planets[i].planetName); });
  el.addEventListener('mouseleave', ()=>{ el.classList.remove('hovered'); hideTooltip(); });
}

// drawJunction using svg line and junction icon
function drawJunction(ax,ay,bx,by,isDashed=false){
  const svg = document.getElementById('svg-layer');
  const line = document.createElementNS('http://www.w3.org/2000/svg','path');
  const mx = (ax+bx)/2, my = (ay+by)/2;
  const ctrlx = mx + (Math.random()*80-40), ctrly = my + (Math.random()*40-20);
  const d = `M ${ax} ${ay} Q ${ctrlx} ${ctrly} ${bx} ${by}`;
  line.setAttribute('d', d); line.setAttribute('stroke','rgba(255,255,255,0.06)'); line.setAttribute('fill','none'); line.setAttribute('class','pulse-path');
  if(isDashed) line.setAttribute('stroke-dasharray','6 6');
  svg.appendChild(line);
  // place junction icon near the middle
  const junctions = document.getElementById('junctions');
  const icon = document.createElement('img'); icon.className='junction'; icon.src = ASSETS.junctionIcon || ''; icon.style.left = mx + 'px'; icon.style.top = my + 'px';
  junctions.appendChild(icon);
}

// tooltip
function showTooltip(text){ let tt = document.querySelector('.tooltip'); if(!tt){ tt = document.createElement('div'); tt.className='tooltip'; document.body.appendChild(tt); } tt.textContent = text; tt.style.display='block'; document.addEventListener('mousemove', moveTooltip); }
function moveTooltip(e){ const tt = document.querySelector('.tooltip'); if(!tt) return; tt.style.left = (e.clientX+12)+'px'; tt.style.top = (e.clientY+12)+'px'; }
function hideTooltip(){ const tt = document.querySelector('.tooltip'); if(tt) tt.style.display='none'; document.removeEventListener('mousemove', moveTooltip); }

// planet interactions: open panel with achievements
function onPlanetPointerDown(e, index){
  // show panel for planet
  const panel = document.getElementById('panel');
  const title = document.getElementById('panel-title');
  const body = document.getElementById('panel-body');
  title.textContent = DATA.planets[index].planetName;
  body.innerHTML = '';
  for(const tier of DATA.planets[index].tiers){
    const h = document.createElement('h4'); h.textContent = `${tier.tierName}`;
    body.appendChild(h);
    for(const a of tier.achievements){
      const div = document.createElement('div'); div.style.marginBottom='8px';
      const t = document.createElement('div'); t.textContent = a.title; t.style.fontWeight='600';
      const d = document.createElement('div'); d.textContent = a.description; d.style.fontSize='13px'; d.style.opacity='0.8';
      const btn = document.createElement('button'); btn.textContent = (a.status==='completed' ? 'Completed' : (a.status==='locked'? 'Locked' : 'Complete')); btn.style.marginTop='6px';
      btn.disabled = (a.status==='locked' || a.status==='completed');
      btn.addEventListener('click', ()=>{ a.status='completed'; a.dateCompleted=new Date().toISOString(); btn.textContent='Completed'; });
      div.appendChild(t); div.appendChild(d); div.appendChild(btn);
      body.appendChild(div);
    }
  }
  panel.classList.remove('hidden');
}

// panel close
document.addEventListener('click', (e)=>{ const panel=document.getElementById('panel'); if(!panel.contains(e.target) && !e.target.closest('.planet')){ panel.classList.add('hidden'); } });
document.getElementById('panel-close').addEventListener('click', ()=>{ document.getElementById('panel').classList.add('hidden'); });

// pan & pinch handlers for camera
let pointers = {}, prev = null, startTransform = {x:0,y:0,scale:1}, current = {x:0,y:0,scale:1};
const camera = document.getElementById('camera');
const viewport = document.getElementById('viewport');

viewport.addEventListener('pointerdown', (e)=>{ viewport.setPointerCapture(e.pointerId); pointers[e.pointerId]=e; if(Object.keys(pointers).length===1){ prev = {x:e.clientX,y:e.clientY}; startTransform = {...current}; } });
viewport.addEventListener('pointermove', (e)=>{ if(!(e.pointerId in pointers)) return; pointers[e.pointerId]=e; const ids = Object.keys(pointers); if(ids.length===1){ const p = pointers[ids[0]]; const dx = p.clientX - prev.x; const dy = p.clientY - prev.y; current.x = startTransform.x + dx; current.y = startTransform.y + dy; updateCamera(); } else if(ids.length===2){ const p1=pointers[ids[0]], p2=pointers[ids[1]]; const dist = Math.hypot(p2.clientX-p1.clientX, p2.clientY-p1.clientY); if(!startTransform._dist){ startTransform._dist = dist; startTransform._scale = startTransform.scale || current.scale; } const scale = Math.max(0.5, Math.min(2.5, startTransform._scale * (dist / startTransform._dist))); current.scale = scale; updateCamera(); } });
viewport.addEventListener('pointerup', (e)=>{ delete pointers[e.pointerId]; startTransform._dist = null; startTransform._scale = current.scale; prev = null; });
viewport.addEventListener('pointercancel', (e)=>{ delete pointers[e.pointerId]; prev=null; });

function updateCamera(){ camera.style.transform = `translate(${current.x}px, ${current.y}px) scale(${current.scale})`; }

// admin UI handlers
document.getElementById('open-admin').addEventListener('click', ()=>{ document.getElementById('admin-modal').classList.remove('hidden'); document.getElementById('admin-json').value = JSON.stringify(DATA, null, 2); });
document.getElementById('admin-close').addEventListener('click', ()=>{ document.getElementById('admin-modal').classList.add('hidden'); });
document.getElementById('admin-save').addEventListener('click', ()=>{ try{ const parsed = JSON.parse(document.getElementById('admin-json').value); DATA = parsed; alert('Saved to session (client).'); buildScene(); }catch(e){ alert('Invalid JSON: '+e.message); } });
document.getElementById('admin-download').addEventListener('click', ()=>{ const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='achievements_export.json'; a.click(); URL.revokeObjectURL(url); });

// init
(async function(){ await loadConfig(); generateData(); buildScene(); })();
