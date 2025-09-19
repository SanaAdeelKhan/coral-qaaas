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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting agent registration process with Coral server...');

    // Fetch all agents that need registration
    const { data: agents, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .is('coral_agent_id', null);

    if (fetchError) {
      console.error('Error fetching agents:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${agents?.length || 0} agents to register`);

    const registrationResults = [];

    // Register each agent with Coral server
    for (const agent of agents || []) {
      try {
        console.log(`Registering agent: ${agent.name} (${agent.type})`);
        
        const registrationPayload = {
          agent_id: agent.id,
          name: agent.name,
          type: agent.type,
          endpoint_url: agent.endpoint_url,
          capabilities: agent.capabilities,
          metadata: agent.metadata
        };

        // Register with Coral server at localhost:5555
        const coralResponse = await fetch('http://localhost:5555/register-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationPayload),
        });

        if (!coralResponse.ok) {
          const errorText = await coralResponse.text();
          console.error(`Coral server registration failed for ${agent.name}:`, errorText);
          continue;
        }

        const coralResult = await coralResponse.json();
        const coralAgentId = coralResult.coral_agent_id || coralResult.id || `coral_${agent.id.slice(0, 8)}`;

        console.log(`Agent ${agent.name} registered with Coral ID: ${coralAgentId}`);

        // Update agent record with coral_agent_id
        const { error: updateError } = await supabase
          .from('agents')
          .update({ 
            coral_agent_id: coralAgentId,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id);

        if (updateError) {
          console.error(`Error updating agent ${agent.name}:`, updateError);
        }

        // Record registration in agent_registrations table
        const { error: regError } = await supabase
          .from('agent_registrations')
          .insert({
            agent_id: agent.id,
            coral_server_url: 'http://localhost:5555',
            registration_status: 'completed',
            coral_response: coralResult,
            registered_at: new Date().toISOString()
          });

        if (regError) {
          console.error(`Error recording registration for ${agent.name}:`, regError);
        }

        registrationResults.push({
          agent_id: agent.id,
          agent_name: agent.name,
          coral_agent_id: coralAgentId,
          status: 'registered',
          coral_response: coralResult
        });

      } catch (error) {
        console.error(`Registration failed for agent ${agent.name}:`, error);
        registrationResults.push({
          agent_id: agent.id,
          agent_name: agent.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('Agent registration process completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Registered ${registrationResults.filter(r => r.status === 'registered').length} agents`,
        results: registrationResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in coral-agent-registration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});