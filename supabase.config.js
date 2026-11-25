/**
 * PROTTABORTON 2.0 (প্রত্যাবর্তন ২.০)
 * Supabase Client Configuration
 *
 * SECURITY NOTICE:
 * - ONLY provide your Supabase Project URL and Public Anonymous Key (anon key) here.
 * - NEVER put your service_role secret key in this file or any client-side file.
 * - The public anon key is safe for browsers because Row Level Security (RLS)
 *   and SECURITY DEFINER RPC functions strictly guard the database.
 */

(function () {
  'use strict';

  // Default configuration
  // Replace the placeholder values with your real Supabase Project credentials:
  // Supabase Dashboard -> Project Settings -> API
  const DEFAULT_CONFIG = {
    url: 'https://gdunfafwrukmsjhivhtt.supabase.co',
    anonKey: 'sb_publishable_YwqBcVzckttVzJ5ocDev1w_wxiCO3iz',
    
    // Optional: If you deployed Supabase Edge Functions, specify the URLs here.
    // If left empty, the client automatically uses direct PostgreSQL RPC via the Supabase SDK / REST API.
    recordVisitUrl: '',
    getStatsUrl: '',

    // Tracking configuration
    sessionInactivityMinutes: 30, // Window of inactivity after which a new session is started
    autoRefreshIntervalSeconds: 60 // Periodically refresh stats on the page if visible
  };

  // Merge with any pre-existing window.__SUPABASE_CONFIG__ or localStorage overrides (useful for local development)
  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const localAnonKey = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

  window.SUPABASE_CONFIG = Object.assign({}, DEFAULT_CONFIG, window.__SUPABASE_CONFIG__ || {}, {
    url: localUrl || (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.url) || DEFAULT_CONFIG.url,
    anonKey: localAnonKey || (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.anonKey) || DEFAULT_CONFIG.anonKey
  });

  // Helper to check if credentials have been populated
  window.isSupabaseConfigured = function () {
    const cfg = window.SUPABASE_CONFIG;
    return !!(
      cfg &&
      cfg.url &&
      cfg.anonKey &&
      !cfg.url.includes('YOUR_PROJECT_ID') &&
      !cfg.anonKey.includes('YOUR_SUPABASE_ANON_KEY')
    );
  };
})();
