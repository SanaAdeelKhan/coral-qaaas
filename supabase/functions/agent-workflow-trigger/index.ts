import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { test_run_id } = await req.json();
    
    if (!test_run_id) {
      throw new Error('test_run_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Triggering workflow for test run: ${test_run_id}`);

    // Trigger the orchestrator for this specific test run
    const orchestratorResponse = await fetch(`${supabaseUrl}/functions/v1/test-run-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_PUBLISHABLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test_run_id }),
    });

    if (!orchestratorResponse.ok) {
      const errorText = await orchestratorResponse.text();
      console.error('Orchestrator failed:', errorText);
      throw new Error(`Orchestrator failed: ${errorText}`);
    }

    const orchestratorResult = await orchestratorResponse.json();
    
    console.log('Workflow triggered successfully:', orchestratorResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Workflow triggered successfully',
        orchestrator_result: orchestratorResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in agent-workflow-trigger:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});