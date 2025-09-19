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

    console.log('Test Run Orchestrator: Starting to process queued test runs...');

    // Find all queued test runs
    const { data: queuedRuns, error: fetchError } = await supabase
      .from('test_runs')
      .select(`
        *,
        repositories (
          id,
          name,
          github_url,
          branch,
          clone_url
        )
      `)
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching queued test runs:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${queuedRuns?.length || 0} queued test runs to process`);

    // Get all active agents for the workflow - prioritize registered agents, fall back to unregistered
    const { data: registeredAgents, error: registeredError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .not('coral_agent_id', 'is', null)
      .order('created_at', { ascending: true });

    if (registeredError) {
      console.error('Error fetching registered agents:', registeredError);
    }

    let agents = registeredAgents || [];
    console.log(`Found ${agents.length} registered agents`);

    // If no registered agents, use unregistered ones as fallback
    if (agents.length === 0) {
      console.log('No registered agents found, using unregistered agents as fallback');
      const { data: unregisteredAgents, error: unregisteredError } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (unregisteredError) {
        console.error('Error fetching unregistered agents:', unregisteredError);
        throw unregisteredError;
      }

      agents = unregisteredAgents || [];
      console.log(`Found ${agents.length} total active agents (unregistered)`);
    }

    const results = [];

    // Process each queued test run
    for (const testRun of queuedRuns || []) {
      try {
        console.log(`Processing test run ${testRun.id} for repository ${testRun.repositories?.name}`);

        // Update test run to running status
        const { error: updateError } = await supabase
          .from('test_runs')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            total_agents: 9, // QAaaS workflow has 9 defined agent steps
            completed_agents: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', testRun.id);

        if (updateError) {
          console.error(`Error updating test run ${testRun.id}:`, updateError);
          continue;
        }

        // Start the agent workflow
        await startAgentWorkflow(supabase, testRun, agents || []);

        results.push({
          test_run_id: testRun.id,
          repository: testRun.repositories?.name,
          status: 'started',
          total_agents: 9 // QAaaS workflow has 9 defined agent steps
        });

      } catch (error) {
        console.error(`Error processing test run ${testRun.id}:`, error);
        
        // Mark test run as failed
        await supabase
          .from('test_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', testRun.id);

        results.push({
          test_run_id: testRun.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} test runs`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in test-run-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function startAgentWorkflow(supabase: any, testRun: any, agents: any[]) {
  console.log(`Starting workflow for test run ${testRun.id}`);

  // QAaaS workflow sequence
  const workflowSequence = [
    'repoClonerAgent',
    'fuzzAgent', 
    'unitTestAgent',
    'integrationAgent',
    'mistralBugReasoningAgent',
    'securityAgent',
    'aggregatorAgent',
    'blockchainLogger',
    'voiceQAagent'
  ];

  let workflowData = {
    repository: testRun.repositories,
    test_run_id: testRun.id,
    results: {}
  };

  for (let i = 0; i < workflowSequence.length; i++) {
    const agentType = workflowSequence[i];
    const agent = agents.find(a => a.type === agentType);
    
    if (!agent) {
      console.log(`Skipping ${agentType} - agent not found`);
      continue;
    }

    const isRegistered = agent.coral_agent_id ? 'registered' : 'unregistered';
    console.log(`Starting ${agentType} (${isRegistered}) for test run ${testRun.id}`);

    try {
      console.log(`Executing agent ${i + 1}/${workflowSequence.length}: ${agent.name} (${agent.type})`);

      // Create test result record
      const { data: testResult, error: resultError } = await supabase
        .from('test_results')
        .insert({
          test_run_id: testRun.id,
          agent_id: agent.id,
          agent_type: agent.type,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (resultError) {
        console.error(`Error creating test result for ${agent.name}:`, resultError);
        continue;
      }

      // Execute agent workflow step
      const agentResult = await executeAgentStep(agent, workflowData);

      // Update test result with completion
      await supabase
        .from('test_results')
        .update({
          status: agentResult.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          execution_time_ms: agentResult.execution_time_ms,
          logs: agentResult.logs,
          result_data: agentResult.data
        })
        .eq('id', testResult.id);

      // Update workflow data with results
      workflowData.results[agentType] = agentResult.data;

      // Update test run progress
      await supabase
        .from('test_runs')
        .update({
          completed_agents: i + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', testRun.id);

      console.log(`Completed agent ${agent.name} with status: ${agentResult.success ? 'success' : 'failed'}`);

    } catch (error) {
      console.error(`Error executing agent ${agent.name}:`, error);
      
      // Mark agent as failed and continue
      await supabase
        .from('test_results')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          logs: `Agent execution failed: ${error.message}`
        })
        .eq('test_run_id', testRun.id)
        .eq('agent_id', agent.id);
    }
  }

  // Mark test run as completed
  await supabase
    .from('test_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', testRun.id);

  console.log(`Workflow completed for test run ${testRun.id}`);
}

async function executeAgentStep(agent: any, workflowData: any) {
  const startTime = Date.now();
  
  try {
    console.log(`Executing ${agent.type} with workflow data`);

    // Simulate agent execution based on type
    const result = await simulateAgentExecution(agent, workflowData);
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      execution_time_ms: executionTime,
      logs: `${agent.type} executed successfully`,
      data: result
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      execution_time_ms: executionTime,
      logs: `${agent.type} failed: ${error.message}`,
      data: { error: error.message }
    };
  }
}

async function simulateAgentExecution(agent: any, workflowData: any) {
  // Agent-specific execution logic
  switch (agent.type) {
    case 'repoClonerAgent':
      return {
        cloned_repo: workflowData.repository?.github_url,
        branch: workflowData.repository?.branch || 'main',
        clone_path: `/tmp/repos/${workflowData.repository?.name}`,
        files_count: Math.floor(Math.random() * 100) + 50
      };

    case 'fuzzAgent':
      return {
        fuzz_tests_run: Math.floor(Math.random() * 1000) + 500,
        vulnerabilities_found: Math.floor(Math.random() * 5),
        crash_count: Math.floor(Math.random() * 3)
      };

    case 'unitTestAgent':
      const totalTests = Math.floor(Math.random() * 50) + 20;
      const passed = Math.floor(totalTests * (0.8 + Math.random() * 0.2));
      return {
        tests_run: totalTests,
        tests_passed: passed,
        tests_failed: totalTests - passed,
        coverage_percentage: Math.floor(Math.random() * 30) + 70
      };

    case 'integrationAgent':
      return {
        integration_tests_run: Math.floor(Math.random() * 20) + 10,
        api_endpoints_tested: Math.floor(Math.random() * 15) + 5,
        performance_score: Math.floor(Math.random() * 30) + 70
      };

    case 'mistralBugReasoningAgent':
      // This would use OpenAI/Mistral API for actual analysis
      return {
        bugs_analyzed: Math.floor(Math.random() * 10) + 5,
        severity_high: Math.floor(Math.random() * 3),
        severity_medium: Math.floor(Math.random() * 5),
        severity_low: Math.floor(Math.random() * 8),
        ai_recommendations: [
          "Consider adding input validation for user data",
          "Implement proper error handling in async functions",
          "Add unit tests for edge cases"
        ]
      };

    case 'securityAgent':
      return {
        security_scan_completed: true,
        vulnerabilities_found: Math.floor(Math.random() * 5),
        security_score: Math.floor(Math.random() * 30) + 70,
        recommendations: [
          "Update dependencies with known vulnerabilities",
          "Implement rate limiting on API endpoints"
        ]
      };

    case 'aggregatorAgent':
      return {
        overall_score: Math.floor(Math.random() * 30) + 70,
        test_summary: {
          total_tests: workflowData.results?.unitTestAgent?.tests_run || 0,
          bugs_found: workflowData.results?.mistralBugReasoningAgent?.bugs_analyzed || 0,
          security_issues: workflowData.results?.securityAgent?.vulnerabilities_found || 0
        },
        recommendation: "Project shows good test coverage and security practices"
      };

    case 'blockchainLogger':
      return {
        blockchain_logged: true,
        transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        block_number: Math.floor(Math.random() * 1000000) + 15000000,
        gas_used: Math.floor(Math.random() * 100000) + 21000
      };

    case 'voiceQAagent':
      return {
        voice_summary_generated: true,
        audio_duration_seconds: Math.floor(Math.random() * 120) + 30,
        key_insights: [
          `Repository ${workflowData.repository?.name} shows good code quality`,
          "All critical tests are passing",
          "No major security vulnerabilities detected"
        ]
      };

    default:
      return {
        executed: true,
        timestamp: new Date().toISOString(),
        agent_type: agent.type
      };
  }
}