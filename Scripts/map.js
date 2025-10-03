// Interactive map demo for vendor booking
(function(){
  try{
  const svg = document.getElementById('site-map');
  if(!svg) return;
  const SPOTS_KEY = 'vendor_spots_v1';

  // Helper: create a spot element from data and append to #spots
  function createSpotEl(s){
    const ns = 'http://www.w3.org/2000/svg';
    let el;
    if(s.type === 'rect'){
      el = document.createElementNS(ns, 'rect');
      el.setAttribute('x', s.x);
      el.setAttribute('y', s.y);
      el.setAttribute('width', s.w);
      el.setAttribute('height', s.h);
      if(s.rx) el.setAttribute('rx', s.rx);
    } else {
      el = document.createElementNS(ns, 'circle');
      el.setAttribute('cx', s.cx);
      el.setAttribute('cy', s.cy);
      el.setAttribute('r', s.r);
    }
    el.classList.add('spot');
    el.dataset.id = s.id;
    el.dataset.price = s.price;
    // copy any extra attributes
    if(s.fill) el.setAttribute('fill', s.fill);
    const spotsGroup = svg.querySelector('#spots');
    if(spotsGroup) spotsGroup.appendChild(el);
    return el;
  }

  // Load spots from localStorage if present, otherwise use existing DOM spots
  function loadSpotsFromStorage(){
    const raw = localStorage.getItem(SPOTS_KEY);
    if(!raw) return Array.from(svg.querySelectorAll('.spot'));
    try{
      const data = JSON.parse(raw);
      const spotsGroup = svg.querySelector('#spots');
      if(spotsGroup){
        spotsGroup.innerHTML = '';
        data.forEach(s => createSpotEl(s));
      }
      return Array.from(svg.querySelectorAll('.spot'));
    }catch(e){ console.error('Failed to parse spots JSON', e); return Array.from(svg.querySelectorAll('.spot')); }
  }

  let spots = loadSpotsFromStorage();
  // editing flag must exist before binding handlers so bindSpotHandlers can read it
  let editing = false;
  // helper to rebind event listeners to spot elements
  function bindSpotHandlers(){
    // remove existing handles
    Array.from(svg.querySelectorAll('.resize-handle')).forEach(h=>h.remove());
    spots = Array.from(svg.querySelectorAll('.spot'));
    spots.forEach(s => {
      s.style.pointerEvents = 'auto';
      // assign handlers (overwrite previous) to avoid duplicates
      s.onclick = () => selectSpot(s);
      s.onmouseenter = (e) => { const id = s.dataset.id; const price = applyDiscount(Number(s.dataset.price)); s.setAttribute('title', `${id} — ${formatCurrency(price)}`); };
      // if rect and in edit mode, add resize handle
      if(s.tagName.toLowerCase() === 'rect' && editing) addResizeHandle(s);
    });
    renderSpots();
  }
  const nonprofitToggle = document.getElementById('nonprofit-toggle');
  const clearBtn = document.getElementById('clear-reservations');
  const selectedInfo = document.getElementById('selected-info');
  const selectedPriceEl = document.getElementById('selected-price');
  const reserveBtn = document.getElementById('reserve-btn');
  const modal = document.getElementById('booking-modal');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const bookingForm = document.getElementById('booking-form');
  const spotIdInput = document.getElementById('spotId');
  // admin / edit UI elements (declare early so functions can reference them)
  const priceEditWrap = document.getElementById('price-edit');
  const editPriceInput = document.getElementById('edit-price');
  const savePriceBtn = document.getElementById('save-price-btn');
  const idEditWrap = document.getElementById('id-edit');
  const editIdInput = document.getElementById('edit-id');
  const saveIdBtn = document.getElementById('save-id-btn');
  const deleteSpotBtn = document.getElementById('delete-spot-btn');
  // edit mode buttons (declare early so updateAdminUI can access)
  const toggleEditBtn = document.getElementById('toggle-edit');
  const exportBtn = document.getElementById('export-spots');
  const addSpotBtn = document.getElementById('add-spot-btn');
  const saveSpotsBtn = document.getElementById('save-spots-btn');

  const STORAGE_KEY = 'vendor_map_reservations_v1';
  let reservations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  let selectedSpot = null;

  const spotsGroup = svg.querySelector('#spots');

  // ensure admin UI shows/hides correctly
  function updateAdminUI(){
    const isAdmin = !!localStorage.getItem('admin_auth');
    Array.from(document.getElementsByClassName('admin-only')).forEach(el=> el.style.display = isAdmin ? 'inline-block' : 'none');
    if(toggleEditBtn) toggleEditBtn.disabled = !isAdmin;
  }

  function formatCurrency(n){ return '$' + Number(n).toFixed(2); }

  function applyDiscount(price){
    if (nonprofitToggle && nonprofitToggle.checked) return Math.round(price * 0.8);
    return price;
  }

  function renderSpots(){
    spots.forEach(s => {
      const id = s.dataset.id;
      if(reservations[id]) s.classList.add('reserved'); else s.classList.remove('reserved');
    });
  }

  function selectSpot(el){
    if(!el || el.classList.contains('reserved')) return;
    selectedSpot = el;
    const id = el.dataset.id; const price = Number(el.dataset.price);
    selectedInfo.textContent = id;
    selectedPriceEl.textContent = formatCurrency(applyDiscount(price));
    reserveBtn.disabled = false;
    spotIdInput.value = id;
    // show price editor if admin + editing
    const isAdmin = !!localStorage.getItem('admin_auth');
    if(isAdmin && editing){
      priceEditWrap.style.display = 'block';
      editPriceInput.value = Number(el.dataset.price || 0);
      if(idEditWrap){ idEditWrap.style.display = 'block'; editIdInput.value = el.dataset.id || ''; }
    } else {
      priceEditWrap.style.display = 'none';
      if(idEditWrap) idEditWrap.style.display = 'none';
    }
  }

  // Delegated click on group as a robust fallback
  if(spotsGroup){
    spotsGroup.addEventListener('click', (e)=>{
      const t = e.target;
      if(t && t.classList && t.classList.contains('spot')){
        selectSpot(t);
      }
    });
  }

  bindSpotHandlers();
  updateAdminUI();

  reserveBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    if(selectedSpot.classList.contains('reserved')) return alert('Already reserved');
    modal.setAttribute('aria-hidden','false');
    document.getElementById('modal-title').textContent = `Reserve ${selectedSpot.dataset.id}`;
  });

  function closeModal(){ modal.setAttribute('aria-hidden','true'); bookingForm.reset(); }
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);

  bookingForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = spotIdInput.value;
    const name = document.getElementById('b-name').value.trim();
    const email = document.getElementById('b-email').value.trim();
    if(!id || !name || !email) return alert('Please complete the form.');
    reservations[id] = { name, email, time: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    renderSpots();
    closeModal();
    alert(`Spot ${id} reserved. Thank you, ${name}!`);
  });

  clearBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all local reservations?')) return;
    reservations = {}; localStorage.removeItem(STORAGE_KEY); renderSpots();
  });

  nonprofitToggle && nonprofitToggle.addEventListener('change', ()=>{
    if(selectedSpot){ const p = Number(selectedSpot.dataset.price); selectedPriceEl.textContent = formatCurrency(applyDiscount(p)); }
    renderSpots();
  });

  renderSpots();
  // --- Edit mode support ---
  let dragEl = null;
  let dragOffset = {x:0,y:0};

  function svgPointFromEvent(evt){
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function enableEditMode(enable){
    // require admin auth flag
    const isAdmin = !!localStorage.getItem('admin_auth');
    if(!isAdmin){ alert('Edit mode requires admin login'); return; }
    editing = !!enable;
    svg.classList.toggle('edit-mode', editing);
    toggleEditBtn.textContent = editing ? 'Exit Edit Mode' : 'Toggle Edit Mode';
    // show admin-only UI in the page
    Array.from(document.getElementsByClassName('admin-only')).forEach(el=> el.style.display = editing ? 'inline-block' : 'none');
    // rebind handlers so resize handles are added/removed
    bindSpotHandlers();
  }

  // disable or hide toggle if not admin
  if(!localStorage.getItem('admin_auth')){
    if(toggleEditBtn) { toggleEditBtn.disabled = true; toggleEditBtn.title = 'Admin login required to edit'; }
    Array.from(document.getElementsByClassName('admin-only')).forEach(el=> el.style.display = 'none');
  } else {
    Array.from(document.getElementsByClassName('admin-only')).forEach(el=> el.style.display = 'inline-block');
  }
  if(toggleEditBtn) toggleEditBtn.addEventListener('click', ()=> enableEditMode(!editing));

  // Add Spot button: creates a new rect at center of viewBox
  addSpotBtn && addSpotBtn.addEventListener('click', ()=>{
    if(!localStorage.getItem('admin_auth')) return alert('Admin required');
    enableEditMode(true);
    const id = 'S' + Math.floor(Math.random()*900 + 100);
    const defaultRect = { id, type:'rect', x:420, y:220, w:120, h:120, price:100 };
    // append to svg and storage
    createSpotEl(defaultRect);
    bindSpotHandlers();
    selectSpot(svg.querySelector(`[data-id='${id}']`));
  });

  // Save Spots button: serialize current spots to SPOTS_KEY
  saveSpotsBtn && saveSpotsBtn.addEventListener('click', ()=>{
    const spotEls = Array.from(svg.querySelectorAll('.spot'));
    const out = spotEls.map(s => {
      const tag = s.tagName.toLowerCase();
      const base = { id: s.dataset.id, price: Number(s.dataset.price) };
      if(tag === 'rect') return Object.assign(base, { type:'rect', x:+s.getAttribute('x'), y:+s.getAttribute('y'), w:+s.getAttribute('width'), h:+s.getAttribute('height') });
      return Object.assign(base, { type:'circle', cx:+s.getAttribute('cx'), cy:+s.getAttribute('cy'), r:+s.getAttribute('r') });
    });
    localStorage.setItem(SPOTS_KEY, JSON.stringify(out));
    alert('Spots saved to localStorage');
  });

  // Price editing
  savePriceBtn && savePriceBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    const v = Number(editPriceInput.value || 0);
    selectedSpot.dataset.price = v;
    document.getElementById('selected-price').textContent = formatCurrency(applyDiscount(v));
    // persist to storage automatically
    saveSpotsBtn && saveSpotsBtn.click();
  });

  // ID editing
  saveIdBtn && saveIdBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    const newId = (editIdInput.value||'').trim(); if(!newId) return alert('ID cannot be empty');
    // check for duplicate id
    const existing = Array.from(svg.querySelectorAll('.spot')).find(s=>s.dataset.id === newId && s !== selectedSpot);
    if(existing) return alert('ID already in use');
    selectedSpot.dataset.id = newId;
    selectedInfo.textContent = newId;
    spotIdInput.value = newId;
    persistSpotsToStorage();
  });

  // Delete spot
  deleteSpotBtn && deleteSpotBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    const id = selectedSpot.dataset.id;
    if(reservations[id]) return alert('Cannot delete a reserved spot');
    if(!confirm(`Delete spot ${id}?`)) return;
    selectedSpot.remove(); selectedSpot = null;
    selectedInfo.textContent = 'None'; selectedPriceEl.textContent = '$0';
    if(idEditWrap) idEditWrap.style.display='none'; if(priceEditWrap) priceEditWrap.style.display='none';
    persistSpotsToStorage(); bindSpotHandlers();
  });

  svg.addEventListener('pointerdown', (e)=>{
    if(!editing) return;
    const t = e.target;
    if(!t.classList.contains('spot')) return;
    // ensure spot becomes selected immediately when editing (before drag)
    try{ selectSpot(t); }catch(err){/* ignore */}
    dragEl = t;
    const p = svgPointFromEvent(e);
    if(dragEl.tagName.toLowerCase() === 'rect'){
      dragOffset.x = p.x - parseFloat(dragEl.getAttribute('x'));
      dragOffset.y = p.y - parseFloat(dragEl.getAttribute('y'));
    } else if (dragEl.tagName.toLowerCase() === 'circle'){
      dragOffset.x = p.x - parseFloat(dragEl.getAttribute('cx'));
      dragOffset.y = p.y - parseFloat(dragEl.getAttribute('cy'));
    }
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener('pointermove', (e)=>{
    if(!dragEl) return;
    const p = svgPointFromEvent(e);
    if(dragEl.tagName.toLowerCase() === 'rect'){
      dragEl.setAttribute('x', Math.round(p.x - dragOffset.x));
      dragEl.setAttribute('y', Math.round(p.y - dragOffset.y));
    } else {
      dragEl.setAttribute('cx', Math.round(p.x - dragOffset.x));
      dragEl.setAttribute('cy', Math.round(p.y - dragOffset.y));
    }
  });

  svg.addEventListener('pointerup', (e)=>{
    if(!dragEl) return;
    // output new coords to console for export
    const id = dragEl.dataset.id;
    let coords = {};
    if(dragEl.tagName.toLowerCase() === 'rect') coords = { x: +dragEl.getAttribute('x'), y: +dragEl.getAttribute('y'), w:+dragEl.getAttribute('width'), h:+dragEl.getAttribute('height') };
    else coords = { cx:+dragEl.getAttribute('cx'), cy:+dragEl.getAttribute('cy'), r:+dragEl.getAttribute('r') };
    console.log('SPOT_UPDATED', id, coords);
    // update dataset and persist small change to spots storage key
    persistSpotsToStorage();
    dragEl = null;
  });

  exportBtn.addEventListener('click', ()=>{
    const spotEls = Array.from(svg.querySelectorAll('.spot'));
    const out = spotEls.map(s => {
      const tag = s.tagName.toLowerCase();
      const base = { id: s.dataset.id, price: Number(s.dataset.price) };
      if(tag === 'rect') return Object.assign(base, { type:'rect', x:+s.getAttribute('x'), y:+s.getAttribute('y'), w:+s.getAttribute('width'), h:+s.getAttribute('height') });
      return Object.assign(base, { type:'circle', cx:+s.getAttribute('cx'), cy:+s.getAttribute('cy'), r:+s.getAttribute('r') });
    });
    const json = JSON.stringify(out, null, 2);
    // copy to clipboard if available
    if(navigator.clipboard) navigator.clipboard.writeText(json).then(()=> alert('Spots JSON copied to clipboard'));
    // also trigger download
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'spots.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // persist current spots to SPOTS_KEY
  function persistSpotsToStorage(){
    const spotEls = Array.from(svg.querySelectorAll('.spot'));
    const out = spotEls.map(s => {
      const tag = s.tagName.toLowerCase();
      const base = { id: s.dataset.id, price: Number(s.dataset.price) };
      if(tag === 'rect') return Object.assign(base, { type:'rect', x:+s.getAttribute('x'), y:+s.getAttribute('y'), w:+s.getAttribute('width'), h:+s.getAttribute('height') });
      return Object.assign(base, { type:'circle', cx:+s.getAttribute('cx'), cy:+s.getAttribute('cy'), r:+s.getAttribute('r') });
    });
    localStorage.setItem(SPOTS_KEY, JSON.stringify(out));
  }

  // Add a small resize handle for rect (bottom-right corner)
  function addResizeHandle(rectEl){
    const ns = 'http://www.w3.org/2000/svg';
    const handle = document.createElementNS(ns,'rect');
    handle.classList.add('resize-handle');
    const updateHandle = ()=>{
      const x = +rectEl.getAttribute('x'); const y=+rectEl.getAttribute('y'); const w=+rectEl.getAttribute('width'); const h=+rectEl.getAttribute('height');
      handle.setAttribute('x', x + w - 10); handle.setAttribute('y', y + h - 10); handle.setAttribute('width', 14); handle.setAttribute('height', 14);
    };
    updateHandle();
    // attach pointer handlers for resize
    let resizing=false; let start={};
  handle.addEventListener('pointerdown', (ev)=>{ if(!editing) return; ev.stopPropagation(); resizing=true; svg.setPointerCapture(ev.pointerId); start = svgPointFromEvent(ev); start.w = +rectEl.getAttribute('width'); start.h = +rectEl.getAttribute('height'); start.x = +rectEl.getAttribute('x'); start.y = +rectEl.getAttribute('y'); });
    svg.addEventListener('pointermove', (ev)=>{ if(!resizing) return; const p = svgPointFromEvent(ev); const nw = Math.max(20, Math.round(start.w + (p.x - start.x))); const nh = Math.max(20, Math.round(start.h + (p.y - start.y))); rectEl.setAttribute('width', nw); rectEl.setAttribute('height', nh); updateHandle(); });
    svg.addEventListener('pointerup', (ev)=>{ if(resizing){ resizing=false; persistSpotsToStorage(); } });
    rectEl.parentNode.appendChild(handle);
  }

  // listen for storage events so when admin saves spots the map reloads
  window.addEventListener('storage', (e)=>{
    if(e.key === SPOTS_KEY){
      loadSpotsFromStorage(); bindSpotHandlers();
    }
    if(e.key === 'admin_auth'){
      // enable/disable edit button when auth changes
      updateAdminUI();
      if(!localStorage.getItem('admin_auth')) enableEditMode(false);
    }
  });

  // also react to manual saves in this window
  const originalSave = localStorage.setItem;
  // we won't monkeypatch setItem, instead expose a simple poll to detect changes when admin saves
  let lastSpots = localStorage.getItem(SPOTS_KEY);
  setInterval(()=>{
    const cur = localStorage.getItem(SPOTS_KEY);
    if(cur !== lastSpots){ lastSpots = cur; loadSpotsFromStorage(); bindSpotHandlers(); }
    const auth = localStorage.getItem('admin_auth');
    updateAdminUI();
  }, 1000);
  }catch(err){
    console.error('Map init error', err);
    try{ alert('Map script error: ' + (err && err.message)); }catch(e){}
  }
})();
