const track = document.querySelector('.carousel-track');
      const images = Array.from(document.querySelectorAll('.carousel-img'));
      const prevBtn = document.querySelector('.carousel-btn.prev');
      const nextBtn = document.querySelector('.carousel-btn.next');
      let currentIndex = 0;

      function updateCarousel() {
        images.forEach((img, idx) => {
          img.classList.toggle('active', idx === currentIndex);
        });
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      }

      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateCarousel();
      });

      nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        updateCarousel();
      });

      // Optional: swipe support for mobile
      let startX = 0;
      track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });
      track.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        if (endX < startX - 30) nextBtn.click();
        if (endX > startX + 30) prevBtn.click();
      });

      // Initialize
      updateCarousel();