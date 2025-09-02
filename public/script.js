// Keep for future; shows role if present on /login.html
console.log("Learnly landing loaded");




// Enhanced interactions, AOS init and responsive parallax
document.addEventListener('DOMContentLoaded', () => {
  // Init AOS with responsive settings
  if (window.AOS) {
    AOS.init({
      once: true,
      duration: 1000,
      easing: 'ease-out-cubic',
      offset: 100,
      disable: window.innerWidth < 768 ? 'mobile' : false
    });
  }

  // Prevent images being dragged accidentally
  document.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

  // Enhanced tag pill interactions
  const tag = document.querySelector('.tag');
  if (tag) {
    tag.addEventListener('mouseenter', () => {
      tag.style.transform = 'translateY(-3px) scale(1.02)';
    });
    tag.addEventListener('mouseleave', () => {
      tag.style.transform = '';
    });

    // Touch support for mobile
    tag.addEventListener('touchstart', () => {
      tag.style.transform = 'translateY(-2px) scale(1.01)';
    });
    tag.addEventListener('touchend', () => {
      setTimeout(() => tag.style.transform = '', 200);
    });
  }

  // Enhanced button interactions
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Create ripple effect
      const ripple = document.createElement('span');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255,255,255,0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1;
      `;

      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });

    // Hover effects for desktop
    btn.addEventListener('mouseenter', () => {
      if (window.innerWidth > 768) {
        btn.style.transform = 'translateY(-2px) scale(1.02)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // Responsive parallax for 3D element
  const splineEl = document.querySelector('.roboy-3d');
  if (splineEl && window.innerWidth > 768) {
    let isParallaxActive = true;

    const handleParallax = (ev) => {
      if (!isParallaxActive) return;

      const x = (ev.clientX / window.innerWidth - 0.5) * 2;
      const y = (ev.clientY / window.innerHeight - 0.5) * 2;

      const tx = x * 10;
      const ty = y * 8;
      const rx = y * 2;
      const ry = x * -2;

      splineEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };

    window.addEventListener('pointermove', handleParallax);

    window.addEventListener('pointerleave', () => {
      splineEl.style.transform = '';
    });

    // Disable parallax on small screens
    window.addEventListener('resize', () => {
      isParallaxActive = window.innerWidth > 768;
      if (!isParallaxActive) {
        splineEl.style.transform = '';
      }
    });
  }

  // Smooth scroll behavior for any internal links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

let text = document.getElementById('text');
let leaf = document.getElementById('leaf');
let hill1 = document.getElementById('hill1');
let hill2 = document.getElementById('hill2');
let hill3 = document.getElementById('hill3');
let hill4 = document.getElementById('hill4');
let hill5 = document.getElementById('hill5');
let tree = document.getElementById('tree');
let plant = document.getElementById('plant');

// Ensure images load properly
document.addEventListener('DOMContentLoaded', function() {
    const images = [hill1, hill2, hill3, hill4, hill5, tree, leaf, plant].filter(Boolean);
    images.forEach(img => {
        if (img) {
            img.onerror = function() {
                console.warn('Failed to load image:', this.src);
            };
        }
    });
});