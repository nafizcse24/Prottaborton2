// Supabase Edge Function: record-visit
// Secure, serverless visitor ingestion with automatic deduplication
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables in Edge Function');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const { visitorId, sessionId, deviceType } = body;

    // Validate inputs
    if (!visitorId || typeof visitorId !== 'string' || visitorId.length < 8 || visitorId.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing visitorId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeDevice = typeof deviceType === 'string' ? deviceType.slice(0, 32) : 'desktop';

    // Execute atomic PostgreSQL record_visit RPC function
    const { data, error } = await supabase.rpc('record_visit', {
      p_visitor_id: visitorId,
      p_session_id: sessionId,
      p_device_type: safeDevice
    });

    if (error) {
      console.error('Error invoking record_visit RPC:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record visit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: data
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (err: any) {
    console.error('Unexpected exception in record-visit:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
