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
    if (s.description) el.dataset.description = s.description;
    // copy any extra attributes
    if(s.fill) el.setAttribute('fill', s.fill);
    const spotsGroup = svg.querySelector('#spots');
    if(spotsGroup) spotsGroup.appendChild(el);
    return el;
  }

  // Load spots from spots.json, localStorage, or existing DOM spots
  async function loadSpotsFromStorage(){
    // First try localStorage
    const raw = localStorage.getItem(SPOTS_KEY);
    if(raw){
      try{
        const data = JSON.parse(raw);
        const spotsGroup = svg.querySelector('#spots');
        if(spotsGroup){
          spotsGroup.innerHTML = '';
          data.forEach(s => createSpotEl(s));
        }
        return Array.from(svg.querySelectorAll('.spot'));
      }catch(e){ console.error('Failed to parse localStorage spots JSON', e); }
    }
    
    // Try to load from spots.json file
    try{
      const response = await fetch('spots.json');
      if(response.ok){
        const data = await response.json();
        const spotsGroup = svg.querySelector('#spots');
        if(spotsGroup){
          spotsGroup.innerHTML = '';
          data.forEach(s => createSpotEl(s));
        }
        // Save to localStorage for future use
        localStorage.setItem(SPOTS_KEY, JSON.stringify(data));
        return Array.from(svg.querySelectorAll('.spot'));
      }
    }catch(e){ console.error('Failed to load spots.json', e); }
    
    // Fallback to existing DOM spots
    return Array.from(svg.querySelectorAll('.spot'));
  }

  let spots = [];
  // editing flag must exist before binding handlers so bindSpotHandlers can read it
  let editing = false;
  
  // Initialize spots asynchronously
  async function initializeSpots(){
    spots = await loadSpotsFromStorage();
    bindSpotHandlers();
    updateAdminUI();
  }
  
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
  // no per-reservation discount selector (discounts removed)
  const clearBtn = document.getElementById('clear-reservations');
  const selectedInfo = document.getElementById('selected-info');
  const selectedPriceEl = document.getElementById('selected-price');
  const reserveBtn = document.getElementById('reserve-btn');
  const adminReserveBtn = document.getElementById('admin-reserve-btn');
  const adminReleaseBtn = document.getElementById('admin-release-btn');
  const modal = document.getElementById('booking-modal');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const bookingForm = document.getElementById('booking-form');
  const spotIdInput = document.getElementById('spotId');
  const paymentArea = document.getElementById('payment-area');
  const paymentStatus = document.getElementById('payment-status');
  const paymentElementDiv = document.getElementById('payment-element');
  // admin / edit UI elements (declare early so functions can reference them)
  const priceEditWrap = document.getElementById('price-edit');
  const editPriceInput = document.getElementById('edit-price');
  const savePriceBtn = document.getElementById('save-price-btn');
  const idEditWrap = document.getElementById('id-edit');
  const editIdInput = document.getElementById('edit-id');
  const saveIdBtn = document.getElementById('save-id-btn');
  const deleteSpotBtn = document.getElementById('delete-spot-btn');
  const descriptionEditWrap = document.getElementById('description-edit');
  const editDescriptionInput = document.getElementById('edit-description');
  // edit mode buttons (declare early so updateAdminUI can access)
  const toggleEditBtn = document.getElementById('toggle-edit');
  const exportBtn = document.getElementById('export-spots');
  const addSpotBtn = document.getElementById('add-spot-btn');
  const saveSpotsBtn = document.getElementById('save-spots-btn');

  const STORAGE_KEY = 'vendor_map_reservations_v1';
  let reservations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  let selectedSpot = null;

  const spotsGroup = svg.querySelector('#spots');

  // Helper functions
  function formatCurrency(n){ return '$' + Number(n).toFixed(2); }

  function applyDiscount(price){
    // discounts removed — always show base price
    return price;
  }

  // Calculate total price including add-ons
  function calculateTotalPrice(basePrice) {
    let total = basePrice;
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox input[type="checkbox"]:checked');
    addonCheckboxes.forEach(checkbox => {
      const addonPrice = Number(checkbox.dataset.price) || 0;
      total += addonPrice;
    });
    return total;
  }

  // Update price display when add-ons change
  function updatePriceDisplay() {
    if (selectedSpot) {
      const basePrice = Number(selectedSpot.dataset.price) || 0;
      const totalPrice = calculateTotalPrice(basePrice);
      
      // Update both price displays
      if (selectedPriceEl) selectedPriceEl.textContent = formatCurrency(basePrice); // Show base price in sidebar
      
      const modalTotalPrice = document.getElementById('modal-total-price');
      if (modalTotalPrice) modalTotalPrice.textContent = formatCurrency(totalPrice); // Show total in modal
    }
  }

  // ensure admin UI shows/hides correctly
  function updateAdminUI(){
    const isAdmin = (typeof userManager !== 'undefined' && userManager.isAdmin()) || !!localStorage.getItem('admin_auth');
    const canEdit = (typeof userManager !== 'undefined' && userManager.canEdit()) || isAdmin;
    
    Array.from(document.getElementsByClassName('admin-only')).forEach(el=> el.style.display = isAdmin ? 'inline-block' : 'none');
    Array.from(document.getElementsByClassName('edit-only')).forEach(el=> el.style.display = canEdit ? 'inline-block' : 'none');
    
    if(toggleEditBtn) toggleEditBtn.disabled = !canEdit;
  }

  function renderSpots(){
    spots.forEach(s => {
      const id = s.dataset.id;
      if(reservations[id]) s.classList.add('reserved'); else s.classList.remove('reserved');
      // make reserved spots linkable if a website was provided
      if(reservations[id] && reservations[id].website){
        s.style.cursor = 'pointer';
        s.onclick = () => { window.open(reservations[id].website, '_blank'); };
      }
    });
  }
  function updateAdminUI(){
    const isAdmin = (typeof userManager !== 'undefined' && userManager.isAdmin()) || !!localStorage.getItem('admin_auth');
    const canEdit = (typeof userManager !== 'undefined' && userManager.canEdit()) || isAdmin;
    
    Array.from(document.getElementsByClassName('admin-only')).forEach(el=> el.style.display = isAdmin ? 'inline-block' : 'none');
    Array.from(document.getElementsByClassName('edit-only')).forEach(el=> el.style.display = canEdit ? 'inline-block' : 'none');
    
    if(toggleEditBtn) toggleEditBtn.disabled = !canEdit;
  }

  function formatCurrency(n){ return '$' + Number(n).toFixed(2); }

  function renderSpots(){
    spots.forEach(s => {
      const id = s.dataset.id;
      if(reservations[id]) s.classList.add('reserved'); else s.classList.remove('reserved');
      // make reserved spots linkable if a website was provided
      if(reservations[id] && reservations[id].website){
        s.style.cursor = 'pointer';
        s.onclick = () => { window.open(reservations[id].website, '_blank'); };
      }
    });
  }

  function selectSpot(el){
    selectedSpot = el;
    const id = el.dataset.id; const price = Number(el.dataset.price);
    const description = el.dataset.description || '';
    const isReserved = el.classList.contains('reserved');
    
    selectedInfo.textContent = id;
    selectedPriceEl.textContent = formatCurrency(applyDiscount(price)); // This will be updated when modal opens
    
    // Show/hide description
    const descriptionEl = document.getElementById('selected-description');
    if (description) {
      descriptionEl.textContent = description;
      descriptionEl.style.display = 'block';
    } else {
      descriptionEl.style.display = 'none';
    }
    
    // Enable/disable buttons based on reservation status
    reserveBtn.disabled = isReserved;
    spotIdInput.value = id;
    
    // Admin button logic
    const isAdmin = !!localStorage.getItem('admin_auth');
    if (isAdmin) {
      if (adminReserveBtn) {
        adminReserveBtn.disabled = isReserved;
      }
      if (adminReleaseBtn) {
        adminReleaseBtn.disabled = !isReserved;
      }
    }
    
    // show editor controls if admin + editing
    
    if(isAdmin && editing){
      priceEditWrap.style.display = 'block';
      editPriceInput.value = Number(el.dataset.price || 0);
      if(idEditWrap){ idEditWrap.style.display = 'block'; editIdInput.value = el.dataset.id || ''; }
      
      if(descriptionEditWrap) {
        descriptionEditWrap.style.display = 'block';
        editDescriptionInput.value = description || '';
      }
    } else {
      priceEditWrap.style.display = 'none';
      if(idEditWrap) idEditWrap.style.display = 'none';
      if(descriptionEditWrap) descriptionEditWrap.style.display = 'none';
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

  // Initialize spots and interactivity
  initializeSpots();

  reserveBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    if(selectedSpot.classList.contains('reserved')) return alert('Already reserved');
    modal.setAttribute('aria-hidden','false');
    document.getElementById('modal-title').textContent = `Reserve ${selectedSpot.dataset.id}`;
    
    // Reset addon checkboxes and update price display
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox input[type="checkbox"]');
    addonCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.addEventListener('change', updatePriceDisplay);
    });
    updatePriceDisplay(); // Show initial price with no add-ons
  });

  function closeModal(){ 
    modal.setAttribute('aria-hidden','true'); 
    bookingForm.reset(); 
    // Clean up Stripe Elements
    const paymentElementDiv = document.getElementById('payment-element');
    const paymentArea = document.getElementById('payment-area');
    const stripePayBtn = document.getElementById('stripe-pay-btn');
    if (paymentElementDiv) paymentElementDiv.innerHTML = '';
    if (stripePayBtn) stripePayBtn.remove();
    if (paymentArea) {
      const paymentStatus = document.getElementById('payment-status');
      if (paymentStatus) paymentStatus.textContent = '';
    }
    // Remove addon event listeners to prevent memory leaks
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox input[type="checkbox"]');
    addonCheckboxes.forEach(checkbox => {
      checkbox.removeEventListener('change', updatePriceDisplay);
    });
  }
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);

  // toggle payment UI when Pay Now is checked
  // paymentArea stays hidden until we show it during the payment flow


  // Stripe payment processing
  async function processStripePayment(amountCents, name, email) {
    console.log('Starting Stripe payment process...', { amountCents, name, email });
    paymentStatus.textContent = 'Preparing payment...';
    
    // 1. Fetch clientSecret from your backend
    let clientSecret;
    try {
      console.log('Fetching clientSecret from backend...');
      const resp = await fetch('http://localhost:4242/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents, name, email })
      });
      console.log('Response status:', resp.status);
      console.log('Response ok:', resp.ok);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Backend error: ${resp.status} - ${errorText}`);
      }
      
      const responseText = await resp.text();
      console.log('Raw response text:', responseText);
      
      if (!responseText) {
        throw new Error('Empty response from backend');
      }
      
      const data = JSON.parse(responseText);
      console.log('Backend response:', data);
      if (!data || !data.clientSecret) throw new Error('No clientSecret returned from server');
      clientSecret = data.clientSecret;
      console.log('Got clientSecret:', clientSecret);
    } catch (err) {
      console.error('Failed to get clientSecret:', err);
      paymentStatus.textContent = 'Failed to start payment: ' + (err && err.message);
      throw err;
    }
    
    // 2. Initialize Stripe Elements
    let stripe, elements, paymentElement;
    try {
      console.log('Initializing Stripe Elements...');
      if (!window.Stripe) throw new Error('Stripe.js not loaded');
      
      stripe = Stripe('pk_test_51RwcwpKb3zZqK3NL4xHf81dIdyj5uC0DPn7uB0vK53CY6AcEAui4KwydjlX9cbM0tJ8XdhUabcwzVWOB61GyA5JQ00PIOq8xrk');
      const appearance = { /* appearance options here */ };
      const options = {
        layout: {
          type: 'tabs',
          defaultCollapsed: false,
        }
      };
      elements = stripe.elements({ clientSecret, appearance });
      
      // Remove any previous payment element and button
      if (paymentElementDiv) paymentElementDiv.innerHTML = '';
      const existingPayBtn = document.getElementById('stripe-pay-btn');
      if (existingPayBtn) existingPayBtn.remove();
      
      paymentElement = elements.create('payment', options);
      console.log('Mounting payment element...');
      
      // Add error handler for payment element
      paymentElement.on('loaderror', (event) => {
        console.error('Payment element load error:', event.error);
        paymentStatus.textContent = 'Payment form load error: ' + event.error.message;
      });
      
      paymentElement.on('ready', () => {
        console.log('Payment element ready');
        paymentStatus.textContent = 'Please complete payment below.';
      });
      
      await paymentElement.mount('#payment-element');
      console.log('Payment element mounted successfully');
      
      // 3. Wait for user to submit payment
      return new Promise((resolve, reject) => {
      // Always create a fresh Pay button
      const payBtn = document.createElement('button');
      payBtn.id = 'stripe-pay-btn';
      payBtn.textContent = 'Pay';
      payBtn.className = 'btn primary';
      paymentArea.appendChild(payBtn);
      payBtn.onclick = async (ev) => {
        ev.preventDefault();
        payBtn.disabled = true;
        paymentStatus.textContent = 'Processing payment...';
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href // or a thank-you page
          },
          redirect: 'if_required'
        });
        if (error) {
          paymentStatus.textContent = error.message;
          payBtn.disabled = false;
          reject(error);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          paymentStatus.textContent = 'Payment successful!';
          resolve({ success: true, transactionId: paymentIntent.id });
        } else {
          paymentStatus.textContent = 'Payment not completed.';
          payBtn.disabled = false;
          reject(new Error('Payment not completed'));
        }
      };
    });
    } catch (err) {
      console.error('Stripe Elements error:', err);
      paymentStatus.textContent = 'Payment setup failed: ' + (err && err.message);
      throw err;
    }
  }

  // Booking submit handler — now always processes Stripe payment flow first
  bookingForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = spotIdInput.value;
    const name = document.getElementById('b-name').value.trim();
    const email = document.getElementById('b-email').value.trim();
    const phone = document.getElementById('b-phone').value.trim();
    const website = document.getElementById('b-website').value.trim();
    if(!id || !name || !email || !phone) return alert('Please complete the form.');
    const basePrice = Number((selectedSpot && selectedSpot.dataset && selectedSpot.dataset.price) || 0);
    const totalPrice = calculateTotalPrice(basePrice);
    if(paymentArea) paymentArea.style.display = 'block';
    try{
      // Stripe payment flow
      const result = await processStripePayment(Math.round(totalPrice * 100), name, email);
      if(!result || !result.success) return alert('Payment failed. Reservation not completed.');
      // Save reservation and annotate spot element
      reservations[id] = { name, email, phone, website: website || '', time: Date.now(), paid: true, transactionId: result.transactionId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
      renderSpots();
      // mark the spot element with helper classes and title text
      const spotEl = svg.querySelector(`[data-id='${id}']`);
      if(spotEl){
        if(phone) spotEl.classList.add('has-phone'); else spotEl.classList.remove('has-phone');
        if(website) spotEl.classList.add('has-website'); else spotEl.classList.remove('has-website');
        let title = `${id} — Reserved by ${name}`;
        if(phone) title += ` • ${phone}`;
        if(website) title += ` • ${website}`;
        spotEl.setAttribute('title', title);
        // ensure reserved spots with websites open link
        if(website) spotEl.onclick = () => window.open(website, '_blank');
        else spotEl.onclick = null;
      }
      closeModal();
      alert(`Spot ${id} reserved and paid. Thank you, ${name}!`);
    }catch(err){ console.error('Payment/reservation error', err); alert('Payment or reservation error: ' + (err && err.message)); }
  });

  clearBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all local reservations?')) return;
    reservations = {}; localStorage.removeItem(STORAGE_KEY); renderSpots();
  });

  // discount selection is now handled per-reservation via #reserve-discount

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

  // Add Spot button: next click on SVG adds a spot at that location
  let addSpotMode = false;
  addSpotBtn && addSpotBtn.addEventListener('click', ()=>{
    if(!localStorage.getItem('admin_auth')) return alert('Admin required');
    enableEditMode(true);
    addSpotMode = true;
    svg.style.cursor = 'crosshair';
  });

  svg.addEventListener('click', (e) => {
    if (!editing || !addSpotMode) return;
    // Only add if click is not on an existing spot or handle
    if (e.target.classList.contains('spot') || e.target.classList.contains('resize-handle')) return;
    const pt = svgPointFromEvent(e);
    const id = 'S' + Math.floor(Math.random()*900 + 100);
    const defaultRect = { id, type:'rect', x:Math.round(pt.x-60), y:Math.round(pt.y-60), w:24, h:24, price:100 };
    createSpotEl(defaultRect);
    bindSpotHandlers();
    selectSpot(svg.querySelector(`[data-id='${id}']`));
    addSpotMode = false;
    svg.style.cursor = '';
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

  // Admin Reserve functionality
  adminReserveBtn && adminReserveBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    const spotId = selectedSpot.dataset.id;
    const spotPrice = Number(selectedSpot.dataset.price || 0);
    
    // Create admin reservation with prompt for basic info
    const customerName = prompt('Enter customer name for admin reservation:');
    if (!customerName) return;
    
    const companyName = prompt('Enter company name:') || 'Admin Reserved';
    const customerEmail = prompt('Enter customer email:') || 'admin@example.com';
    
    // Create reservation object
    const reservation = {
      name: customerName,
      company: companyName,
      email: customerEmail,
      phone: 'N/A',
      website: '',
      description: 'Admin reservation',
      time: Date.now(),
      paid: true, // Admin reservations are marked as paid
      totalAmount: spotPrice,
      addons: []
    };
    
    // Save reservation
    reservations[spotId] = reservation;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    
    // Update UI
    selectedSpot.classList.add('reserved');
    reserveBtn.disabled = true;
    adminReserveBtn.disabled = true;
    adminReleaseBtn.disabled = false;
    
    alert(`Spot ${spotId} reserved for ${customerName} (${companyName})`);
    
    // Re-bind handlers to update the newly reserved spot
    bindSpotHandlers();
  });

  // Admin Release functionality
  adminReleaseBtn && adminReleaseBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    const spotId = selectedSpot.dataset.id;
    const reservation = reservations[spotId];
    
    if (!reservation) {
      alert('No reservation found for this spot.');
      return;
    }
    
    // Confirm release
    const customerInfo = `${reservation.name} (${reservation.company || 'N/A'})`;
    if (!confirm(`Release reservation for ${customerInfo} on spot ${spotId}?`)) {
      return;
    }
    
    // Remove reservation
    delete reservations[spotId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    
    // Update UI
    selectedSpot.classList.remove('reserved');
    reserveBtn.disabled = false;
    adminReserveBtn.disabled = false;
    adminReleaseBtn.disabled = true;
    
    alert(`Spot ${spotId} has been released and is now available.`);
    
    // Re-bind handlers to update the newly available spot
    bindSpotHandlers();
  });

  // Description editing
  const saveDescriptionBtn = document.getElementById('save-description-btn');
  saveDescriptionBtn && saveDescriptionBtn.addEventListener('click', ()=>{
    if(!selectedSpot) return;
    const newDescription = (editDescriptionInput.value||'').trim();
    selectedSpot.dataset.description = newDescription;
    
    // Update the description display
    const descriptionEl = document.getElementById('selected-description');
    if (newDescription) {
      descriptionEl.textContent = newDescription;
      descriptionEl.style.display = 'block';
    } else {
      descriptionEl.style.display = 'none';
    }
    
    persistSpotsToStorage();
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
    document.getElementById('selected-description').style.display = 'none';
    const descriptionEditWrap = document.getElementById('description-edit');
    reserveBtn.disabled = true;
    if(adminReserveBtn) adminReserveBtn.disabled = true;
    if(adminReleaseBtn) adminReleaseBtn.disabled = true;
    if(idEditWrap) idEditWrap.style.display='none'; 
    if(priceEditWrap) priceEditWrap.style.display='none';
    if(descriptionEditWrap) descriptionEditWrap.style.display='none';
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

  if (exportBtn) {
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
  }

  // persist current spots to SPOTS_KEY
  function persistSpotsToStorage(){
    const spotEls = Array.from(svg.querySelectorAll('.spot'));
    const out = spotEls.map(s => {
      const tag = s.tagName.toLowerCase();
      const base = { id: s.dataset.id, price: Number(s.dataset.price) };
      if (s.dataset.description) base.description = s.dataset.description;
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
  window.addEventListener('storage', async (e)=>{
    if(e.key === SPOTS_KEY){
      spots = await loadSpotsFromStorage(); 
      bindSpotHandlers();
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
  setInterval(async ()=>{
    const cur = localStorage.getItem(SPOTS_KEY);
    if(cur !== lastSpots){ 
      lastSpots = cur; 
      spots = await loadSpotsFromStorage(); 
      bindSpotHandlers(); 
    }
    const auth = localStorage.getItem('admin_auth');
    updateAdminUI();
  }, 1000);
  }catch(err){
    console.error('Map init error', err);
    try{ alert('Map script error: ' + (err && err.message)); }catch(e){}
  }
})();
