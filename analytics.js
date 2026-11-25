/**
 * PROTTABORTON 2.0 (প্রত্যাবর্তন ২.০)
 * Privacy-Conscious Supabase Visitor Analytics Engine
 *
 * Metrics:
 * 1. Total Visits (মোট ভিজিট) - Every valid session visit
 * 2. Unique Visitors (অনন্য দর্শনার্থী) - Distinct anonymous visitor UUID
 * 3. Today's Visits (আজকের ভিজিট) - Asia/Dhaka (UTC+6) calendar day
 */

(function () {
  'use strict';

  // State
  let supabaseClient = null;
  let isTrackingInProgress = false;
  let cachedStats = null;

  // DOM elements
  let totalVisitsEl = null;
  let uniqueVisitorsEl = null;
  let todayVisitsEl = null;
  let statusBadgeEl = null;

  const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  // =========================================================================
  // 1. ANONYMOUS IDENTIFIER & SESSION MANAGEMENT
  // =========================================================================

  /**
   * Generates a standard RFC4122 v4 UUID
   */
  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Retrieves or creates a persistent anonymous visitor ID
   */
  function getVisitorId() {
    const STORAGE_KEY = 'prottaborton_visitor_uuid';
    let visitorId = null;
    try {
      visitorId = localStorage.getItem(STORAGE_KEY);
      if (!visitorId || visitorId.length < 10) {
        visitorId = 'v_' + generateUUID();
        localStorage.setItem(STORAGE_KEY, visitorId);
      }
    } catch (e) {
      // Fallback if localStorage is disabled
      visitorId = 'temp_' + generateUUID();
    }
    return visitorId;
  }

  /**
   * Retrieves or creates a session ID with a 30-minute inactivity window
   */
  function getSessionId() {
    const SESSION_KEY = 'prottaborton_session_id';
    const LAST_ACTIVE_KEY = 'prottaborton_last_activity_time';
    const INACTIVITY_LIMIT_MS = (window.SUPABASE_CONFIG?.sessionInactivityMinutes || 30) * 60 * 1000;

    const now = Date.now();
    let sessionId = null;
    let lastActive = 0;

    try {
      sessionId = sessionStorage.getItem(SESSION_KEY);
      lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);

      // Check if session has expired due to inactivity
      if (!sessionId || (lastActive && now - lastActive > INACTIVITY_LIMIT_MS)) {
        sessionId = 's_' + generateUUID();
        sessionStorage.setItem(SESSION_KEY, sessionId);
        sessionStorage.removeItem('prottaborton_session_recorded');
      }

      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    } catch (e) {
      sessionId = 'temp_s_' + generateUUID();
    }

    return sessionId;
  }

  /**
   * Detects device category without collecting sensitive PII
   */
  function getDeviceCategory() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet|(android(?!.*mobile))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // =========================================================================
  // 2. DIGIT FORMATTING & ANIMATION
  // =========================================================================

  function formatCount(num) {
    if (num === null || num === undefined || isNaN(num)) {
      return '--';
    }

    // Number with thousand separators
    const formatted = Number(num).toLocaleString('en-US');

    // Check if the page is currently in Bengali numerals mode
    const isBengali = document.body.classList.contains('bengali-numerals') ||
                      (window.useBengaliNumerals === true);

    if (!isBengali) {
      return formatted;
    }

    return formatted
      .split('')
      .map(char => {
        const digit = parseInt(char, 10);
        return isNaN(digit) ? char : BENGALI_DIGITS[digit];
      })
      .join('');
  }

  /**
   * Smooth number roll animation
   */
  function animateValue(element, start, end, duration) {
    if (!element) return;
    if (isNaN(end)) {
      element.textContent = '--';
      return;
    }

    const range = end - start;
    const startTime = performance.now();

    function updateNumber(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + range * ease);

      element.textContent = formatCount(current);

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = formatCount(end);
      }
    }

    requestAnimationFrame(updateNumber);
  }

  // =========================================================================
  // 3. SUPABASE CLIENT & TRANSPORT LAYER
  // =========================================================================

  /**
   * Initializes the Supabase client
   */
  function initSupabase() {
    const config = window.SUPABASE_CONFIG;
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      return null;
    }

    if (supabaseClient) {
      return supabaseClient;
    }

    // If @supabase/supabase-js library is loaded
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      } catch (err) {
        console.warn('[Analytics] Failed to initialize Supabase JS SDK, will use REST fetch fallback.', err);
      }
    }

    return supabaseClient;
  }

  /**
   * Records a visit via Edge Function or direct PostgreSQL RPC
   */
  async function recordVisitAPI(visitorId, sessionId, deviceCategory) {
    const config = window.SUPABASE_CONFIG;

    // Option A: Custom Edge Function URL if explicitly provided
    if (config.recordVisitUrl) {
      const res = await fetch(config.recordVisitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`
        },
        body: JSON.stringify({
          visitorId: visitorId,
          sessionId: sessionId,
          deviceType: deviceCategory
        })
      });

      if (!res.ok) throw new Error(`Edge Function returned ${res.status}`);
      const json = await res.json();
      return json.stats || json;
    }

    // Option B: Supabase JS Client RPC
    const client = initSupabase();
    if (client && typeof client.rpc === 'function') {
      const { data, error } = await client.rpc('record_visit', {
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_device_type: deviceCategory
      });
      if (error) throw error;
      return data;
    }

    // Option C: Native REST Fetch RPC (No dependency required)
    const rpcUrl = `${config.url.replace(/\/+$/, '')}/rest/v1/rpc/record_visit`;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      },
      body: JSON.stringify({
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_device_type: deviceCategory
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`RPC record_visit failed [${res.status}]: ${errText}`);
    }

    return await res.json();
  }

  /**
   * Retrieves aggregated statistics without recording a new visit
   */
  async function getStatsAPI() {
    const config = window.SUPABASE_CONFIG;

    // Option A: Edge Function
    if (config.getStatsUrl) {
      const res = await fetch(config.getStatsUrl, {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`
        }
      });
      if (!res.ok) throw new Error(`get-stats Edge Function failed: ${res.status}`);
      return await res.json();
    }

    // Option B: Supabase JS Client
    const client = initSupabase();
    if (client && typeof client.rpc === 'function') {
      const { data, error } = await client.rpc('get_visitor_stats');
      if (error) throw error;
      return data;
    }

    // Option C: Native REST Fetch RPC
    const rpcUrl = `${config.url.replace(/\/+$/, '')}/rest/v1/rpc/get_visitor_stats`;
    const res = await fetch(rpcUrl, {
      method: 'POST', // Supabase PostgREST RPC accepts POST
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      },
      body: JSON.stringify({})
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`RPC get_visitor_stats failed [${res.status}]: ${errText}`);
    }

    return await res.json();
  }

  // =========================================================================
  // 4. UI UPDATE LOGIC
  // =========================================================================

  function renderStats(stats, animate = true) {
    if (!stats) return;

    cachedStats = stats;
    try {
      localStorage.setItem('prottaborton_cached_stats', JSON.stringify(stats));
    } catch (e) {}

    const total = parseInt(stats.total_visits, 10) || 0;
    const unique = parseInt(stats.unique_visitors, 10) || 0;
    const today = parseInt(stats.today_visits, 10) || 0;

    if (totalVisitsEl) {
      if (animate) animateValue(totalVisitsEl, 0, total, 1200);
      else totalVisitsEl.textContent = formatCount(total);
    }
    if (uniqueVisitorsEl) {
      if (animate) animateValue(uniqueVisitorsEl, 0, unique, 1200);
      else uniqueVisitorsEl.textContent = formatCount(unique);
    }
    if (todayVisitsEl) {
      if (animate) animateValue(todayVisitsEl, 0, today, 1200);
      else todayVisitsEl.textContent = formatCount(today);
    }

    if (statusBadgeEl) {
      statusBadgeEl.innerHTML = `
        <span class="live-dot-pulse"></span>
        <span>লাইভ সিঙ্ক</span>
      `;
      statusBadgeEl.classList.add('status-online');
      statusBadgeEl.classList.remove('status-offline', 'status-pending');
    }
  }

  function renderPendingState() {
    if (totalVisitsEl) totalVisitsEl.textContent = '--';
    if (uniqueVisitorsEl) uniqueVisitorsEl.textContent = '--';
    if (todayVisitsEl) todayVisitsEl.textContent = '--';

    if (statusBadgeEl) {
      statusBadgeEl.innerHTML = `
        <span class="pending-dot"></span>
        <span>Supabase অপেক্ষমাণ</span>
      `;
      statusBadgeEl.classList.add('status-pending');
      statusBadgeEl.classList.remove('status-online', 'status-offline');
      statusBadgeEl.setAttribute(
        'title',
        'Supabase credentials pending in supabase.config.js'
      );
    }
  }

  function renderOfflineState(errMsg) {
    // Attempt to display cached numbers if available
    try {
      const stored = localStorage.getItem('prottaborton_cached_stats');
      if (stored) {
        const parsed = JSON.parse(stored);
        renderStats(parsed, false);
      }
    } catch (e) {}

    if (statusBadgeEl) {
      statusBadgeEl.innerHTML = `
        <span class="offline-dot"></span>
        <span>অফলাইন</span>
      `;
      statusBadgeEl.classList.add('status-offline');
      statusBadgeEl.classList.remove('status-online', 'status-pending');
      if (errMsg) statusBadgeEl.setAttribute('title', String(errMsg));
    }
  }

  // =========================================================================
  // 5. MAIN TRACKING WORKFLOW
  // =========================================================================

  async function trackAndFetchStats() {
    if (isTrackingInProgress) return;
    isTrackingInProgress = true;

    // Check configuration
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      console.info(
        '%c[Prottaborton 2.0 - Analytics]%c Supabase configuration pending. Set your SUPABASE_URL and SUPABASE_ANON_KEY in supabase.config.js.',
        'color: #F5B942; font-weight: bold;',
        'color: inherit;'
      );
      renderPendingState();
      isTrackingInProgress = false;
      return;
    }

    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const deviceType = getDeviceCategory();

    const alreadyTracked = sessionStorage.getItem('prottaborton_session_recorded') === sessionId;

    try {
      let stats = null;

      if (!alreadyTracked) {
        // Record visit and get updated stats
        stats = await recordVisitAPI(visitorId, sessionId, deviceType);
        sessionStorage.setItem('prottaborton_session_recorded', sessionId);
      } else {
        // Already recorded this session, only fetch fresh counts
        stats = await getStatsAPI();
      }

      renderStats(stats, true);
    } catch (err) {
      console.warn('[Analytics] Failed to track/fetch stats:', err);
      renderOfflineState(err.message || 'Network error');
    } finally {
      isTrackingInProgress = false;
    }
  }

  // Refresh counts on numeral system toggle (Bangla / English)
  window.refreshAnalyticsNumerals = function () {
    if (cachedStats) {
      renderStats(cachedStats, false);
    }
  };

  // =========================================================================
  // 6. INITIALIZATION ON DOM READY
  // =========================================================================

  function init() {
    totalVisitsEl = document.getElementById('statTotalVisits');
    uniqueVisitorsEl = document.getElementById('statUniqueVisitors');
    todayVisitsEl = document.getElementById('statTodayVisits');
    statusBadgeEl = document.getElementById('statStatusBadge');

    if (!totalVisitsEl && !uniqueVisitorsEl && !todayVisitsEl) {
      return;
    }

    // Start tracking and fetch
    trackAndFetchStats();

    // Auto-refresh interval if page remains open (default 60s)
    const intervalSec = window.SUPABASE_CONFIG?.autoRefreshIntervalSeconds || 60;
    setInterval(() => {
      // Only refresh if tab is active and visible
      if (document.visibilityState === 'visible' && window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        getStatsAPI()
          .then(stats => renderStats(stats, false))
          .catch(() => {});
      }
    }, intervalSec * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
