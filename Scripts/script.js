// Showcase continuous auto-scroll carousel
(() => {

  const carousel = document.querySelector('.showcase-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.carousel-track');
  // no controls for display-only carousel

  // Wrap existing items into a single slide-set (3x2 grid)
  const items = Array.from(track.querySelectorAll('.carousel-item'));
  if (!items.length) return;

  const slideSet = document.createElement('div');
  slideSet.className = 'slide-set';
  // move items into slideSet
  items.forEach(item => slideSet.appendChild(item));
  // append the slideSet as the first child of track
  track.appendChild(slideSet);

  // clone the slideSet for seamless looping
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

  // Start animation
  requestAnimationFrame(step);
})();