import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Bot } from 'lucide-react';

interface AgentRegistrationProps {
  onRegistrationComplete?: () => void;
}

export const AgentRegistration: React.FC<AgentRegistrationProps> = ({ onRegistrationComplete }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'in-progress' | 'completed' | 'error'>('idle');
  const [registrationResults, setRegistrationResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleRegisterAgents = async () => {
    setIsRegistering(true);
    setRegistrationStatus('in-progress');
    setRegistrationResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('coral-agent-registration', {
        body: {}
      });

      if (error) {
        throw error;
      }

      console.log('Agent registration response:', data);
      
      setRegistrationResults(data.results || []);
      setRegistrationStatus('completed');
      
      const successCount = data.results?.filter((r: any) => r.status === 'registered').length || 0;
      const failCount = data.results?.filter((r: any) => r.status === 'failed').length || 0;

      toast({
        title: "Agent Registration Complete",
        description: `Successfully registered ${successCount} agents${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (onRegistrationComplete) {
        onRegistrationComplete();
      }

    } catch (error) {
      console.error('Error registering agents:', error);
      setRegistrationStatus('error');
      
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : 'Failed to register agents with Coral server',
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'registered':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Bot className="w-5 h-5" />
          Agent Registration Required
        </CardTitle>
        <CardDescription className="text-orange-700">
          <strong>Important:</strong> Register your QAaaS agents with the Coral server before running tests. 
          Without registration, test runs will skip all agent workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Register all agents with the Coral server to enable test execution
          </div>
          <Button 
            onClick={handleRegisterAgents}
            disabled={isRegistering}
            size="sm"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Register Agents
              </>
            )}
          </Button>
        </div>

        {registrationStatus !== 'idle' && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Registration Results:</div>
            {registrationResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="text-sm">{result.agent_name}</span>
                  {result.coral_agent_id && (
                    <code className="text-xs bg-background px-1 rounded">
                      {result.coral_agent_id}
                    </code>
                  )}
                </div>
                <Badge variant={getStatusBadgeVariant(result.status)}>
                  {result.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {registrationStatus === 'error' && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Registration failed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Please ensure the Coral server is running on localhost:5555
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};