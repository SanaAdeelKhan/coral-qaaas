import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Clearing test results...')

    // Delete all test results first (due to foreign key constraints)
    const { error: resultsError } = await supabase
      .from('test_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (resultsError) {
      console.error('Error deleting test results:', resultsError)
      throw resultsError
    }

    // Delete all test runs
    const { error: runsError } = await supabase
      .from('test_runs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (runsError) {
      console.error('Error deleting test runs:', runsError)
      throw runsError
    }

    console.log('Successfully cleared all test data')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All test results and runs have been cleared' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in clear-test-results function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to clear test results' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})