// Initialize all showcase carousels on the page
(() => {
  const carousels = Array.from(document.querySelectorAll('.showcase-carousel'));
  if (!carousels.length) return;

  carousels.forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    if (!track) return;

    const items = Array.from(track.querySelectorAll('.carousel-item'));
    if (!items.length) return;

    const slideSet = document.createElement('div');
    slideSet.className = 'slide-set';
    items.forEach(item => slideSet.appendChild(item));
    track.appendChild(slideSet);
    const clone = slideSet.cloneNode(true);
    track.appendChild(clone);

    let pos = 0;
    const speed = 30; // pixels per second
    let lastTime = null;
    let running = true;

    function step(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000; // seconds
      lastTime = timestamp;
      if (running) {
        pos += speed * dt;
        const wrapWidth = slideSet.scrollWidth; // width of one set
        if (wrapWidth > 0 && pos >= wrapWidth) pos = 0;
        track.style.transform = `translateX(-${pos}px)`;
      }
      requestAnimationFrame(step);
    }

    // Start animation for this carousel
    requestAnimationFrame(step);
  });
})();

// Footer newsletter handler and footer year
(() => {
  // set current year
  const year = new Date().getFullYear();
  const el = document.getElementById('current-year');
  if (el) el.textContent = String(year);

  const form = document.querySelector('.footer-newsletter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const email = input && input.value && input.value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      input.focus();
      input.style.outline = '2px solid #e87c0e';
      return;
    }
    // simple client-side success state
    form.innerHTML = '<p style="color:#fff;margin:0;">Thanks — check your inbox for a confirmation.</p>';
  });
})();