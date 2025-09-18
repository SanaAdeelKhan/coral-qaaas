-- Update the agents_type_check constraint to allow new QAaaS agent types
ALTER TABLE public.agents DROP CONSTRAINT agents_type_check;

-- Add updated constraint with all QAaaS agent types
ALTER TABLE public.agents ADD CONSTRAINT agents_type_check 
CHECK (type = ANY (ARRAY[
  'repo_cloner'::text, 
  'unit_test'::text, 
  'integration_test'::text, 
  'security_audit'::text, 
  'fuzz_test'::text, 
  'voice_qa'::text, 
  'mistral_reasoning'::text, 
  'aggregator'::text,
  'repoClonerAgent'::text,
  'fuzzAgent'::text,
  'unitTestAgent'::text,
  'integrationAgent'::text,
  'mistralBugReasoningAgent'::text,
  'securityAgent'::text,
  'aggregatorAgent'::text,
  'blockchainLogger'::text,
  'voiceQAagent'::text
]));