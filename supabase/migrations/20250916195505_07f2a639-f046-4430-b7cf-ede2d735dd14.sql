-- Create agents table for Coral Protocol agent registration
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('repo_cloner', 'unit_test', 'integration_test', 'security_audit', 'fuzz_test', 'voice_qa', 'mistral_reasoning', 'aggregator')),
  coral_agent_id TEXT UNIQUE,
  endpoint_url TEXT NOT NULL,
  capabilities JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repositories table for tracked repos
CREATE TABLE public.repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  github_url TEXT NOT NULL,
  clone_url TEXT,
  branch TEXT DEFAULT 'main',
  owner_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_runs table for QA pipeline executions
CREATE TABLE public.test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  coral_transaction_id TEXT,
  solana_transaction_id TEXT,
  ipfs_hash TEXT,
  arweave_hash TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_agents INTEGER DEFAULT 0,
  completed_agents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_results table for individual agent results
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  agent_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result_data JSONB DEFAULT '{}',
  logs TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_registrations table for Coral Protocol registrations
CREATE TABLE public.agent_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  coral_server_url TEXT NOT NULL,
  registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'registered', 'failed')),
  coral_response JSONB DEFAULT '{}',
  registered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
CREATE POLICY "Allow public read access to agents" 
ON public.agents FOR SELECT USING (true);

CREATE POLICY "Allow public insert to agents" 
ON public.agents FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to agents" 
ON public.agents FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to repositories" 
ON public.repositories FOR SELECT USING (true);

CREATE POLICY "Allow public insert to repositories" 
ON public.repositories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to repositories" 
ON public.repositories FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to test_runs" 
ON public.test_runs FOR SELECT USING (true);

CREATE POLICY "Allow public insert to test_runs" 
ON public.test_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to test_runs" 
ON public.test_runs FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to test_results" 
ON public.test_results FOR SELECT USING (true);

CREATE POLICY "Allow public insert to test_results" 
ON public.test_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to test_results" 
ON public.test_results FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to agent_registrations" 
ON public.agent_registrations FOR SELECT USING (true);

CREATE POLICY "Allow public insert to agent_registrations" 
ON public.agent_registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to agent_registrations" 
ON public.agent_registrations FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at
BEFORE UPDATE ON public.repositories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_runs_updated_at
BEFORE UPDATE ON public.test_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at
BEFORE UPDATE ON public.test_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_registrations_updated_at
BEFORE UPDATE ON public.agent_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_agents_type ON public.agents(type);
CREATE INDEX idx_agents_coral_agent_id ON public.agents(coral_agent_id);
CREATE INDEX idx_repositories_github_url ON public.repositories(github_url);
CREATE INDEX idx_test_runs_repository_id ON public.test_runs(repository_id);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_results_test_run_id ON public.test_results(test_run_id);
CREATE INDEX idx_test_results_agent_id ON public.test_results(agent_id);
CREATE INDEX idx_agent_registrations_agent_id ON public.agent_registrations(agent_id);