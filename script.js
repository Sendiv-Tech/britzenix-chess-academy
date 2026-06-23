/* ============================================================
   CHESS ACADEMY — script.js
   Handles: sticky nav, mobile menu, scroll reveal, testimonial
            slider, contact form, counters, floating piece field
            (unlimited drifting + spinning + cursor-parallax pieces),
            and the chess-piece rating system on the Reviews page
   ============================================================ */

'use strict';

/* ── PIECE RATING SYSTEM (star-rating alternative) ───────────
   Escalating piece value: 1=pawn 2=knight 3=bishop 4=rook 5=queen.
   buildPieceRating() renders a row of 5 glyphs, filling up to the
   given rating; everything past it stays dim. Used for static
   display (testimonials, review cards) and the interactive
   "write a review" picker. */
const RATING_GLYPHS = ['♟', '♞', '♝', '♜', '♛'];
const RATING_NAMES  = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen'];

function buildPieceRatingHTML(rating, { interactive = false, size = '' } = {}) {
  const sizeClass = size ? ` ${size}` : '';
  const interactiveClass = interactive ? ' interactive' : '';
  let html = `<span class="piece-rating${sizeClass}${interactiveClass}" data-rating="${rating}" role="img" aria-label="${rating} out of 5">`;
  for (let i = 0; i < 5; i++) {
    const filled = i < rating;
    html += `<span class="pr-piece${filled ? ' filled' : ''}" data-value="${i + 1}" title="${RATING_NAMES[i]}">${RATING_GLYPHS[i]}</span>`;
  }
  html += `</span>`;
  return html;
}

// Render any static [data-piece-rating="N"] placeholders found in the DOM
function renderStaticPieceRatings() {
  document.querySelectorAll('[data-piece-rating]').forEach(el => {
    const rating = parseInt(el.dataset.pieceRating, 10) || 5;
    const size = el.dataset.pieceSize || '';
    el.innerHTML = buildPieceRatingHTML(rating, { size });
  });
}

// Wire up an interactive picker: click a piece to set the rating,
// hover to preview. Expects a wrapper with [data-rating-picker] and
// a hidden input [data-rating-input] to store the chosen value.
function initRatingPicker() {
  const pickers = document.querySelectorAll('[data-rating-picker]');
  pickers.forEach(picker => {
    let current = parseInt(picker.dataset.ratingPicker, 10) || 0;
    picker.innerHTML = buildPieceRatingHTML(current, { interactive: true, size: 'lg' });
    const hiddenInput = document.querySelector(picker.dataset.ratingTarget);
    const label = document.querySelector(picker.dataset.ratingLabel);

    function paint(value) {
      picker.querySelectorAll('.pr-piece').forEach(p => {
        p.classList.toggle('filled', parseInt(p.dataset.value, 10) <= value);
      });
      if (label) {
        label.textContent = value > 0 ? `${RATING_NAMES[value - 1]} · ${value}/5` : 'Select a rating';
        label.style.color = '';
      }
    }

    picker.addEventListener('click', (e) => {
      const target = e.target.closest('.pr-piece');
      if (!target) return;
      current = parseInt(target.dataset.value, 10);
      if (hiddenInput) hiddenInput.value = current;
      paint(current);
    });

    picker.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.pr-piece');
      if (!target) return;
      paint(parseInt(target.dataset.value, 10));
    });
    picker.addEventListener('mouseleave', () => paint(current));

    paint(current);
  });
}

/* ── REVIEW CARD FILTERING ───────────────────────────────────
   Filters cards by data-rating value when a chip is clicked. */
function initReviewFilters() {
  const chips = document.querySelectorAll('.review-filter-chip');
  const cards = document.querySelectorAll('.review-card');
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;

      cards.forEach(card => {
        const matches = filter === 'all' || card.dataset.rating === filter;
        card.style.display = matches ? '' : 'none';
      });
    });
  });
}

/* ── REVIEW SUBMISSION FORM ──────────────────────────────────
   Same simulated-submit pattern as the contact form, plus it
   prepends a freshly built card to the top of the reviews grid
   so the visitor immediately sees their review appear. */
function initReviewForm() {
  const form = document.getElementById('reviewForm');
  if (!form) return;

  function showError(input, msg) {
    clearError(input);
    input.style.borderColor = '#e05c5c';
    const err = document.createElement('span');
    err.className = 'field-error';
    err.style.cssText = 'display:block;color:#e05c5c;font-size:.78rem;margin-top:.35rem';
    err.textContent = msg;
    input.parentNode.appendChild(err);
  }

  function clearError(input) {
    input.style.borderColor = '';
    const prev = input.parentNode.querySelector('.field-error');
    if (prev) prev.remove();
  }

  form.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', () => clearError(el));
    el.addEventListener('change', () => clearError(el));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    form.querySelectorAll('.field-error').forEach((el) => el.remove());
    form.querySelectorAll('input, select, textarea').forEach((el) => (el.style.borderColor = ''));

    let valid = true;

    const ratingInput = form.querySelector('[data-rating-input]');
    const rating = parseInt(ratingInput?.value, 10) || 0;
    const picker = form.querySelector('[data-rating-picker]');
    const ratingLabel = picker ? document.querySelector(picker.dataset.ratingLabel) : null;

    if (rating === 0) {
      if (ratingLabel) {
        ratingLabel.textContent = 'Please choose a rating';
        ratingLabel.style.color = '#e05c5c';
      }
      valid = false;
    }

    const nameInput = form.querySelector('#reviewName');
    const nameVal = nameInput?.value.trim() || '';
    if (!nameVal) {
      showError(nameInput, 'Your name is required');
      valid = false;
    }

    const textInput = form.querySelector('#reviewText');
    const textVal = textInput?.value.trim() || '';
    if (!textVal) {
      showError(textInput, 'Please write a review before posting');
      valid = false;
    }

    if (!valid) {
      const firstError = form.querySelector('.field-error') || (rating === 0 ? picker : null);
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const tagVal  = form.querySelector('#reviewProgram')?.value || 'General';

    const btn = form.querySelector('.btn-gold');
    btn.textContent = 'Posting…';
    btn.disabled = true;

    setTimeout(() => {
      const grid = document.querySelector('.reviews-grid');
      if (grid) {
        const card = document.createElement('div');
        card.className = 'review-card reveal visible';
        card.dataset.rating = String(rating);
        const initial = nameVal.charAt(0).toUpperCase() || 'A';
        card.innerHTML = `
          <div class="review-card-top">
            <div data-piece-rating="${rating}"></div>
            <span class="review-date">Just now</span>
          </div>
          <span class="review-card-tag">${tagVal}</span>
          <p class="review-card-text">${textVal.replace(/</g, '&lt;')}</p>
          <div class="testi-author">
            <div class="testi-avatar">${initial}</div>
            <div>
              <div class="testi-name">${nameVal}</div>
              <div class="testi-role">New Student</div>
            </div>
          </div>`;
        grid.prepend(card);
        renderStaticPieceRatings();
      }

      form.style.display = 'none';
      const success = document.querySelector('.review-form-success');
      if (success) success.style.display = 'block';
    }, 1200);
  });
}

/* ── FLOATING CHESS-PIECE FIELD ──────────────────────────────
   Each spawned piece is randomly coloured either cream (#EBECD0,
   the light square colour) or slate blue (#5A7A9A, the dark square
   colour) — matching the actual chessboard palette.
   For children's attraction: pieces are a little larger and more
   numerous, with a third pulsing animation (size breathe) layered
   on top of drift + spin for a playful toy-in-motion quality.
   The cursor parallax gives the whole field a sense of depth. */
function initPieceField() {
  const field = document.querySelector('.piece-field');
  if (!field) return;

  let mover = field.querySelector('.piece-field-mover');
  if (!mover) {
    mover = document.createElement('div');
    mover.className = 'piece-field-mover';
    field.appendChild(mover);
  }

  const GLYPHS = ['♔', '♕', '♖', '♗', '♘', '♙'];

  // Two colour families matching the actual board squares
  const CREAM_COLOURS = [
    'rgba(235,236,208,0.10)',
    'rgba(235,236,208,0.14)',
    'rgba(235,236,208,0.08)',
    'rgba(220,221,190,0.12)',
  ];
  const SLATE_COLOURS = [
    'rgba(90,122,154,0.22)',
    'rgba(90,122,154,0.28)',
    'rgba(70,100,130,0.20)',
    'rgba(110,145,180,0.18)',
  ];

  // More pieces for children's pages — lively and busy
  const MAX_ON_SCREEN = window.innerWidth < 480 ? 8
                      : window.innerWidth < 768 ? 14 : 24;
  let activeCount = 0;

  function spawnPiece() {
    if (activeCount >= MAX_ON_SCREEN) return;
    activeCount++;

    const piece     = document.createElement('span');
    piece.className = 'piece';
    piece.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

    // Alternate between cream and slate — roughly 50/50 mix
    const useCream  = Math.random() > 0.5;
    const palette   = useCream ? CREAM_COLOURS : SLATE_COLOURS;
    const colour    = palette[Math.floor(Math.random() * palette.length)];

    // Size range: bigger than before for children's visibility
    const size      = 1.5 + Math.random() * 3.2;        // rem
    const left      = Math.random() * 100;               // vw %
    const driftPx   = (Math.random() - 0.5) * 200;       // wider sideways wander
    const driftDur  = 14 + Math.random() * 16;            // 14–30s rise time
    const spinDur   = 8  + Math.random() * 16;            // 8–24s per full spin
    const spinDir   = Math.random() > 0.5 ? 'normal' : 'reverse';
    // Pulse duration: fast for pawn/small glyphs, slow for king
    const pulseDur  = 2.5 + Math.random() * 3;            // 2.5–5.5s per breathe

    piece.style.left           = left + 'vw';
    piece.style.fontSize       = size + 'rem';
    piece.style.color          = colour;
    piece.style.setProperty('--drift', driftPx + 'px');
    // Three animation durations: drift, spin, pulse
    piece.style.animationDuration  = `${driftDur}s, ${spinDur}s, ${pulseDur}s`;
    piece.style.animationDirection = `normal, ${spinDir}, alternate`;

    mover.appendChild(piece);

    setTimeout(() => {
      piece.remove();
      activeCount--;
      spawnPiece();
    }, driftDur * 1000);
  }

  // Staggered seed so pieces appear one by one, not in a burst
  for (let i = 0; i < MAX_ON_SCREEN; i++) {
    setTimeout(spawnPiece, i * 500);
  }

  // Cursor parallax — the whole field nudges opposite the pointer
  // for subtle depth, like pieces reacting to the room.
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth) - 0.5;
    const ny = (e.clientY / window.innerHeight) - 0.5;
    targetX = nx * -24; // px
    targetY = ny * -16;
  }, { passive: true });

  function tick() {
    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;
    mover.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── STICKY NAVBAR ───────────────────────────────────────── */
const navbar = document.querySelector('.navbar');
if (navbar) {
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ── ACTIVE NAV LINK ─────────────────────────────────────── */
(function setActiveLink() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .mobile-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

/* ── MOBILE MENU ─────────────────────────────────────────── */
const hamburger  = document.querySelector('.hamburger');
const mobileNav  = document.querySelector('.mobile-nav');
const mobileLinks = document.querySelectorAll('.mobile-nav .nav-link, .mobile-nav .btn');

function toggleMenu(open) {
  hamburger?.classList.toggle('open', open);
  mobileNav?.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

hamburger?.addEventListener('click', () => {
  const isOpen = mobileNav?.classList.contains('open');
  toggleMenu(!isOpen);
});
mobileLinks.forEach(link => link.addEventListener('click', () => toggleMenu(false)));

/* ── SCROLL REVEAL ───────────────────────────────────────── */
function initReveal() {
  const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
}

/* ── TESTIMONIAL SLIDER ──────────────────────────────────── */
function initSlider() {
  const track  = document.querySelector('.testimonial-track');
  const dotsWrap = document.querySelector('.slider-dots');
  const btnPrev  = document.querySelector('.slider-btn.prev');
  const btnNext  = document.querySelector('.slider-btn.next');
  if (!track) return;

  const cards     = track.querySelectorAll('.testimonial-card');
  const total     = cards.length;
  let current     = 0;
  let autoInterval;

  // Build dots
  if (dotsWrap) {
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function getVisible() {
    const w = track.parentElement.offsetWidth;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 3;
  }

  function goTo(index) {
    const vis    = getVisible();
    const maxIdx = Math.max(0, total - vis);
    current = Math.max(0, Math.min(index, maxIdx));

    const cardW  = cards[0].offsetWidth + 24; // gap = 1.5rem = 24px
    track.style.transform = `translateX(-${current * cardW}px)`;

    document.querySelectorAll('.slider-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  btnPrev?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  btnNext?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  function resetAuto() {
    clearInterval(autoInterval);
    autoInterval = setInterval(() => {
      const vis = getVisible();
      const nextIdx = current + 1 > total - vis ? 0 : current + 1;
      goTo(nextIdx);
    }, 5000);
  }

  resetAuto();
  window.addEventListener('resize', () => goTo(current));
}

/* ── COUNTER ANIMATION ───────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start  = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(ease * target);
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ── CONTACT FORM ────────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  function showError(input, msg) {
    clearError(input);
    input.style.borderColor = '#e05c5c';
    const err = document.createElement('span');
    err.className = 'field-error';
    err.style.cssText = 'display:block;color:#e05c5c;font-size:.78rem;margin-top:.35rem';
    err.textContent = msg;
    input.parentNode.appendChild(err);
  }

  function clearError(input) {
    input.style.borderColor = '';
    const prev = input.parentNode.querySelector('.field-error');
    if (prev) prev.remove();
  }

  const phone = document.getElementById('phone');
  if (phone) {
    phone.addEventListener('input', () => {
      const cleaned = phone.value.replace(/[^0-9]/g, '').slice(0, 10);
      if (cleaned !== phone.value) {
        phone.value = cleaned;
        showError(phone, 'Numbers only, please');
      } else {
        clearError(phone);
      }
    });
  }

  form.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el === phone) return;
    el.addEventListener('input', () => clearError(el));
    el.addEventListener('change', () => clearError(el));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    form.querySelectorAll('.field-error').forEach((el) => el.remove());
    form.querySelectorAll('input, select, textarea').forEach((el) => (el.style.borderColor = ''));

    const firstName = document.getElementById('firstName');
    if (!firstName.value.trim()) {
      showError(firstName, 'First name is required');
      valid = false;
    }

    const email = document.getElementById('email');
    const emailVal = email.value.trim();
    if (!emailVal) {
      showError(email, 'Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showError(email, 'Enter valid email');
      valid = false;
    }

    const phoneVal = phone.value.trim();
    if (!phoneVal) {
      showError(phone, 'Mobile number is required');
      valid = false;
    } else if (!/^[0-9]{10}$/.test(phoneVal)) {
      showError(phone, 'Enter valid 10-digit number');
      valid = false;
    }

    const success = document.querySelector('.form-success');

    if (!valid) {
      if (success) success.style.display = 'none';
      form.style.display = 'block';
      const firstError = document.querySelector('.field-error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const btn = form.querySelector('.btn-gold');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    setTimeout(() => {
      form.style.display = 'none';
      if (success) success.style.display = 'block';
    }, 1400);
  });
}

/* ── SMOOTH ANCHOR SCROLL ────────────────────────────────── */
function initSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ── GALLERY LIGHTBOX (minimal) ──────────────────────────── */
function initGallery() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') item.click();
    });
  });
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initSlider();
  initCounters();
  initContactForm();
  initSmoothLinks();
  initGallery();
  renderStaticPieceRatings();
  initRatingPicker();
  initReviewFilters();
  initReviewForm();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) initPieceField();
});