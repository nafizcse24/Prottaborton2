/**
 * প্রত্যাবর্তন ২.০ (PROTTABORTON 2.0)
 * Official Interactive Countdown & Cinematic Experience
 * Target Deadline: 16 December 2026, 12:00 PM BST (UTC+6)
 * ISO Timestamp: 2026-12-16T12:00:00+06:00
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =========================================================================
  // 1. CONFIGURATION & STATE
  // =========================================================================
  const TARGET_DATE_STRING = '2026-12-16T12:00:00+06:00';
  const TARGET_TIMESTAMP = new Date(TARGET_DATE_STRING).getTime();

  let useBengaliNumerals = false; // Default to English as shown in the reference mockup
  let audioContext = null;
  let isAudioPlaying = false;
  let masterGainNode = null;
  let synthOscillators = [];

  const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  // DOM Elements
  const valDays = document.getElementById('valDays');
  const valHours = document.getElementById('valHours');
  const valMinutes = document.getElementById('valMinutes');
  const valSeconds = document.getElementById('valSeconds');

  const countdownPill = document.getElementById('countdownPill');
  const countdownZeroState = document.getElementById('countdownZeroState');

  const numeralToggle = document.getElementById('numeralToggle');
  const numeralModeLabel = document.getElementById('numeralModeLabel');

  const soundToggle = document.getElementById('soundToggle');
  const soundIconOn = soundToggle.querySelector('.sound-icon-on');
  const soundIconOff = soundToggle.querySelector('.sound-icon-off');
  const soundStatusText = document.getElementById('soundStatusText');

  const ctaBtn = document.getElementById('ctaBtn');
  const quickShareBtn = document.getElementById('quickShareBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  const addToGoogleCalBtn = document.getElementById('addToGoogleCalBtn');
  const downloadiCalBtn = document.getElementById('downloadiCalBtn');
  const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
  const shareFacebookBtn = document.getElementById('shareFacebookBtn');
  const shareTwitterBtn = document.getElementById('shareTwitterBtn');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  const subscribeForm = document.getElementById('subscribeForm');
  const subscriberEmail = document.getElementById('subscriberEmail');
  const subSuccessMsg = document.getElementById('subSuccessMsg');

  const tributeForm = document.getElementById('tributeForm');
  const tributeAuthor = document.getElementById('tributeAuthor');
  const tributeDistrict = document.getElementById('tributeDistrict');
  const tributeMsg = document.getElementById('tributeMsg');
  const tributesFeed = document.getElementById('tributesFeed');

  let prevTime = { days: -1, hours: -1, minutes: -1, seconds: -1 };

  // =========================================================================
  // 2. DIGIT CONVERSION HELPERS
  // =========================================================================
  function formatNumber(num) {
    const padded = String(num).padStart(2, '0');
    if (!useBengaliNumerals) {
      return padded;
    }
    return padded.split('').map(d => BENGALI_DIGITS[parseInt(d, 10)] || d).join('');
  }

  // =========================================================================
  // 3. LIVE FUNCTIONAL COUNTDOWN ENGINE
  // =========================================================================
  function updateCountdown() {
    const now = Date.now();
    const distance = TARGET_TIMESTAMP - now;

    if (distance <= 0) {
      // ZERO STATE: Target reached!
      if (countdownPill && !countdownPill.classList.contains('hidden')) {
        countdownPill.classList.add('hidden');
      }
      if (countdownZeroState) {
        countdownZeroState.classList.remove('hidden');
      }
      return;
    }

    // Time calculations
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Update Days
    if (days !== prevTime.days) {
      valDays.textContent = formatNumber(days);
      triggerTick(valDays);
      prevTime.days = days;
    }

    // Update Hours
    if (hours !== prevTime.hours) {
      valHours.textContent = formatNumber(hours);
      triggerTick(valHours);
      prevTime.hours = hours;
    }

    // Update Minutes
    if (minutes !== prevTime.minutes) {
      valMinutes.textContent = formatNumber(minutes);
      triggerTick(valMinutes);
      prevTime.minutes = minutes;
    }

    // Update Seconds
    if (seconds !== prevTime.seconds) {
      valSeconds.textContent = formatNumber(seconds);
      triggerTick(valSeconds);
      prevTime.seconds = seconds;
    }
  }

  function triggerTick(element) {
    if (!element) return;
    element.classList.remove('tick-anim');
    void element.offsetWidth; // Force CSS reflow
    element.classList.add('tick-anim');
  }

  // Run update immediately and then every second
  updateCountdown();
  const countdownInterval = setInterval(updateCountdown, 1000);

  // =========================================================================
  // 4. NUMERAL SYSTEM TOGGLE (EN / BN)
  // =========================================================================
  if (numeralToggle) {
    numeralToggle.addEventListener('click', () => {
      useBengaliNumerals = !useBengaliNumerals;
      numeralModeLabel.textContent = useBengaliNumerals ? 'বাংলা' : 'EN';
      // Force refresh of digits
      prevTime = { days: -1, hours: -1, minutes: -1, seconds: -1 };
      updateCountdown();
      showToast(useBengaliNumerals ? 'বাংলা সংখ্যা সক্রিয় করা হয়েছে' : 'English numerals activated');
    });
  }

  // =========================================================================
  // 5. PROCEDURAL CINEMATIC SOUNDSCAPE (WEB AUDIO API)
  // =========================================================================
  function initAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function startCinematicDrone() {
    initAudio();
    if (isAudioPlaying) return;

    masterGainNode = audioContext.createGain();
    masterGainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    masterGainNode.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + 3);
    masterGainNode.connect(audioContext.destination);

    // Warm resonant drone frequencies (F# minor / heroic tonal roots)
    const baseFreqs = [55, 110, 164.81, 220, 277.18];
    synthOscillators = [];

    baseFreqs.forEach((freq, idx) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      osc.type = idx === 0 ? 'sine' : idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, audioContext.currentTime);

      // Lowpass warmth
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 80, audioContext.currentTime);

      gain.gain.setValueAtTime(0.12 / (idx + 1), audioContext.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGainNode);

      osc.start();
      synthOscillators.push(osc);
    });

    isAudioPlaying = true;
    updateSoundUI(true);
  }

  function stopCinematicDrone() {
    if (!isAudioPlaying || !masterGainNode) return;

    masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, audioContext.currentTime);
    masterGainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);

    setTimeout(() => {
      synthOscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
      synthOscillators = [];
      isAudioPlaying = false;
      updateSoundUI(false);
    }, 1500);
  }

  function updateSoundUI(playing) {
    if (playing) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
      soundStatusText.textContent = 'সাউন্ড চালু';
      soundToggle.classList.add('active-glow');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
      soundStatusText.textContent = 'সাউন্ড';
      soundToggle.classList.remove('active-glow');
    }
  }

  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      if (isAudioPlaying) {
        stopCinematicDrone();
        showToast('সিনেমাটিক অডিও বন্ধ করা হয়েছে');
      } else {
        startCinematicDrone();
        showToast('সিনেমাটিক সাউন্ডস্কেপ চালু হয়েছে');
      }
    });
  }

  // =========================================================================
  // 6. ATMOSPHERIC PARTICLE SIMULATION (CANVAS)
  // =========================================================================
  const canvas = document.getElementById('particleCanvas');
  let ctx = null;
  let particles = [];
  let animFrameId = null;

  if (canvas) {
    ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + 15;
        this.radius = Math.random() * 2.2 + 0.8;
        this.baseSpeedY = Math.random() * 0.45 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.alpha = Math.random() * 0.6 + 0.2;
        this.fadeSpeed = Math.random() * 0.006 + 0.002;
        this.fadingIn = true;
        this.isGold = Math.random() > 0.35;
        this.sway = Math.random() * 6.28;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
      }

      update() {
        this.y -= this.baseSpeedY;
        this.sway += this.swaySpeed;
        this.x += Math.sin(this.sway) * 0.35 + this.speedX;

        if (this.fadingIn) {
          this.alpha += this.fadeSpeed;
          if (this.alpha >= 0.85) this.fadingIn = false;
        } else {
          this.alpha -= this.fadeSpeed;
        }

        if (this.y < -20 || this.alpha <= 0) {
          this.reset(false);
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        if (this.isGold) {
          ctx.fillStyle = `rgba(245, 185, 66, ${this.alpha})`;
          ctx.shadowColor = 'rgba(245, 185, 66, 0.8)';
        } else {
          ctx.fillStyle = `rgba(181, 18, 27, ${this.alpha * 0.8})`;
          ctx.shadowColor = 'rgba(181, 18, 27, 0.6)';
        }
        ctx.shadowBlur = this.radius * 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const particleCount = Math.min(65, Math.floor(window.innerWidth / 20));
    particles = Array.from({ length: particleCount }, () => new Particle());

    function renderParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animFrameId = requestAnimationFrame(renderParticles);
    }

    renderParticles();

    // Pause when tab is inactive to save battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameId);
      } else {
        renderParticles();
      }
    });
  }

  // =========================================================================
  // 7. MODAL: GOOGLE CALENDAR, ICAL & SHARING
  // =========================================================================
  function openModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  if (ctaBtn) ctaBtn.addEventListener('click', openModal);
  if (quickShareBtn) quickShareBtn.addEventListener('click', openModal);
  document.querySelectorAll('.open-modal-btn').forEach(btn => btn.addEventListener('click', openModal));

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Setup Google Calendar Link
  if (addToGoogleCalBtn) {
    const title = encodeURIComponent('প্রত্যাবর্তন ২.০ (Prottaborton 2.0)');
    const details = encodeURIComponent('জয় বাংলা, জয় বঙ্গবন্ধু। ঐতিহাসিক বিজয় দিবস ১৬ ডিসেম্বর ২০২৬-এ প্রত্যাবর্তন ২.০ এর শুভ সূচনা। বিস্তারিত: ' + window.location.href);
    const location = encodeURIComponent('ঢাকা, বাংলাদেশ');
    // Internal target timestamp: 2026-12-16 12:00 PM BST (UTC+6) is 2026-12-16 06:00:00 UTC
    const dates = '20261216T060000Z/20261216T090000Z';
    addToGoogleCalBtn.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  }

  // Generate & Download .ICS Calendar File
  if (downloadiCalBtn) {
    downloadiCalBtn.addEventListener('click', () => {
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Prottaborton 2.0//BN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:prottaborton2-20261216@prottaborton2.org',
        'DTSTAMP:20261124T000000Z',
        'DTSTART:20261216T060000Z',
        'DTEND:20261216T090000Z',
        'SUMMARY:প্রত্যাবর্তন ২.০ (Prottaborton 2.0)',
        'DESCRIPTION:জয় বাংলা, জয় বঙ্গবন্ধু। ঐতিহাসিক বিজয় দিবস ১৬ ডিসেম্বর ২০২৬-এ প্রত্যাবর্তন ২.০ এর মহা সূচনা।',
        'LOCATION:ঢাকা\\, বাংলাদেশ',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'Prottaborton-2.0-Event.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('ক্যালেন্ডার ফাইল (.ics) ডাউনলোড শুরু হয়েছে!');
    });
  }

  // Social Sharing Handlers
  const currentUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent('প্রত্যাবর্তন ২.০ | ১৬ ডিসেম্বর ২০২৬ — জয় বাংলা, জয় বঙ্গবন্ধু। লাইভ কাউন্টডাউন দেখুন:');

  if (shareWhatsAppBtn) {
    shareWhatsAppBtn.addEventListener('click', () => {
      window.open(`https://api.whatsapp.com/send?text=${shareTitle}%20${currentUrl}`, '_blank');
    });
  }

  if (shareFacebookBtn) {
    shareFacebookBtn.addEventListener('click', () => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`, '_blank');
    });
  }

  if (shareTwitterBtn) {
    shareTwitterBtn.addEventListener('click', () => {
      window.open(`https://twitter.com/intent/tweet?text=${shareTitle}&url=${currentUrl}`, '_blank');
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast('কাউন্টডাউন লিংক কপি হয়েছে!');
        }).catch(() => fallbackCopy());
      } else {
        fallbackCopy();
      }
    });
  }

  function fallbackCopy() {
    const tempInput = document.createElement('input');
    document.body.appendChild(tempInput);
    tempInput.value = window.location.href;
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('কাউন্টডাউন লিংক কপি হয়েছে!');
  }

  // Toast System
  let toastTimer = null;
  function showToast(message) {
    if (!toastNotification || !toastMessage) return;
    toastMessage.textContent = message;
    toastNotification.classList.remove('hidden');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, 3200);
  }

  // Email Notification Form
  if (subscribeForm && subscriberEmail) {
    subscribeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = subscriberEmail.value.trim();
      if (email) {
        localStorage.setItem('prottaborton_subscriber', email);
        if (subSuccessMsg) subSuccessMsg.classList.remove('hidden');
        subscriberEmail.value = '';
        setTimeout(() => {
          if (subSuccessMsg) subSuccessMsg.classList.add('hidden');
          closeModal();
        }, 2200);
      }
    });
  }

  // =========================================================================
  // 8. INTERACTIVE TRIBUTE FEED
  // =========================================================================
  function loadTributes() {
    if (!tributesFeed) return;
    const stored = JSON.parse(localStorage.getItem('prottaborton_tributes') || '[]');

    if (stored.length === 0) {
      tributesFeed.innerHTML = `
        <div class="empty-tribute-card">
          <p class="empty-tribute-text">এখনও কোনো বার্তা প্রকাশিত হয়নি। আপনার অনুভূতি বা প্রত্যাশা লিখে প্রথম বার্তাটি পাঠান।</p>
        </div>
      `;
      return;
    }

    tributesFeed.innerHTML = stored.map(item => `
      <div class="tribute-card">
        <p class="tribute-card-text">“${escapeHtml(item.msg)}”</p>
        <div class="tribute-card-meta">
          <span class="tribute-author">${escapeHtml(item.author || 'শুভাকাঙ্ক্ষী')} ${item.district ? `(${escapeHtml(item.district)})` : ''}</span>
          <span class="tribute-time">${escapeHtml(item.time || 'নতুন')}</span>
        </div>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (tributeForm) {
    tributeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = tributeMsg.value.trim();
      if (!msg) return;

      const newTribute = {
        author: tributeAuthor.value.trim() || 'শুভাকাঙ্ক্ষী',
        district: tributeDistrict.value.trim(),
        msg: msg,
        time: 'এখনই'
      };

      const existing = JSON.parse(localStorage.getItem('prottaborton_tributes') || '[]');
      existing.unshift(newTribute);
      localStorage.setItem('prottaborton_tributes', JSON.stringify(existing));

      tributeMsg.value = '';
      tributeAuthor.value = '';
      tributeDistrict.value = '';

      loadTributes();
      showToast('আপনার বার্তা যুক্ত হয়েছে!');
    });
  }

  // Narrative Expand/Collapse Toggle
  const narrativeToggleBtn = document.getElementById('narrativeToggleBtn');
  const narrativeBody = document.getElementById('narrativeBody');
  const narrativeToggleText = document.getElementById('narrativeToggleText');

  if (narrativeToggleBtn && narrativeBody) {
    let isCollapsed = false;
    narrativeToggleBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        narrativeBody.classList.add('narrative-collapsed');
        if (narrativeToggleText) narrativeToggleText.textContent = 'আরও পড়ুন';
        narrativeToggleBtn.setAttribute('aria-expanded', 'false');
        const icon = narrativeToggleBtn.querySelector('.toggle-icon');
        if (icon) icon.style.transform = 'rotate(180deg)';
      } else {
        narrativeBody.classList.remove('narrative-collapsed');
        if (narrativeToggleText) narrativeToggleText.textContent = 'সংক্ষেপ করুন';
        narrativeToggleBtn.setAttribute('aria-expanded', 'true');
        const icon = narrativeToggleBtn.querySelector('.toggle-icon');
        if (icon) icon.style.transform = 'rotate(0deg)';
      }
    });
  }

  loadTributes();
});
