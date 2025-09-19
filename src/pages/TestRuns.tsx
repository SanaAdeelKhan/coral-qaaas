import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Play, Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, Eye, RefreshCw } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { AgentRegistration } from "@/components/AgentRegistration"

interface TestRun {
  id: string
  repository_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  metadata: any
  coral_transaction_id: string | null
  solana_transaction_id: string | null
  ipfs_hash: string | null
  arweave_hash: string | null
  total_agents: number
  completed_agents: number
  created_at: string
  updated_at: string
  repositories?: {
    name: string
    github_url: string
    branch: string
  }
}

interface Repository {
  id: string
  name: string
  github_url: string
  branch: string
}

export default function TestRuns() {
  const [testRuns, setTestRuns] = useState<TestRun[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTestRun, setNewTestRun] = useState({
    repository_id: "",
    metadata: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchTestRuns()
    fetchRepositories()
  }, [])

  const fetchTestRuns = async () => {
    try {
      const { data, error } = await supabase
        .from("test_runs")
        .select(`
          *,
          repositories (name, github_url, branch)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setTestRuns(data || [])
    } catch (error) {
      console.error("Error fetching test runs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch test runs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRepositories = async () => {
    try {
      const { data, error } = await supabase
        .from("repositories")
        .select("id, name, github_url, branch")
        .order("name")

      if (error) throw error
      setRepositories(data || [])
    } catch (error) {
      console.error("Error fetching repositories:", error)
    }
  }

  const handleCreateTestRun = async () => {
    if (!newTestRun.repository_id) {
      toast({
        title: "Error",
        description: "Please select a repository",
        variant: "destructive", 
      })
      return
    }

    try {
      // Create the test run with total_agents set to 9 for QAaaS workflow
      const { data, error } = await supabase
        .from("test_runs")
        .insert([
          {
            repository_id: newTestRun.repository_id,
            status: "queued",
            total_agents: 9, // Set to 9 for QAaaS workflow
            completed_agents: 0,
            metadata: newTestRun.metadata ? JSON.parse(newTestRun.metadata) : {},
          },
        ])
        .select()

      if (error) throw error

      console.log('Test run created:', data);
      
      // Trigger the workflow orchestrator
      if (data && data[0]) {
        try {
          const response = await supabase.functions.invoke('agent-workflow-trigger', {
            body: { test_run_id: data[0].id }
          });
          
          if (response.error) {
            console.error('Error triggering workflow:', response.error);
            toast({
              title: "Warning",
              description: "Test run created but workflow trigger failed",
              variant: "destructive",
            });
          } else {
            console.log('Workflow triggered successfully:', response.data);
            toast({
              title: "Success",
              description: "Test run created and workflow started",
            });
          }
        } catch (triggerError) {
          console.error('Error triggering workflow:', triggerError);
          toast({
            title: "Warning", 
            description: "Test run created but workflow trigger failed",
            variant: "destructive",
          });
        }
      }

      setNewTestRun({
        repository_id: "",
        metadata: "",
      })
      setIsCreateDialogOpen(false)
      fetchTestRuns()
    } catch (error) {
      console.error("Error creating test run:", error)
      toast({
        title: "Error",
        description: "Failed to create test run",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "running":
        return <Clock className="w-4 h-4 text-blue-600" />
      case "queued":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      case "running":
        return "secondary"
      case "queued":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return "Not started"
    if (!endDate) return "In progress"
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = end.getTime() - start.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    return `${minutes}m ${seconds}s`
  }

  const filteredTestRuns = testRuns.filter(run => {
    const matchesSearch = run.repositories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         run.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || run.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Test Runs</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your test executions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              New Test Run
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Test Run</DialogTitle>
              <DialogDescription>
                Start a new test execution on a repository
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="repository" className="text-right">
                  Repository *
                </Label>
                <Select
                  value={newTestRun.repository_id}
                  onValueChange={(value) => setNewTestRun({ ...newTestRun, repository_id: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        {repo.name} ({repo.branch})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="metadata" className="text-right">
                  Metadata
                </Label>
                <Input
                  id="metadata"
                  value={newTestRun.metadata}
                  onChange={(e) => setNewTestRun({ ...newTestRun, metadata: e.target.value })}
                  className="col-span-3"
                  placeholder='{"test_suite": "full", "timeout": 300}'
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTestRun} disabled={!newTestRun.repository_id}>
                Start Test Run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search test runs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredTestRuns.length > 0 ? (
          filteredTestRuns.map((run) => (
            <Card key={run.id} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {run.repositories?.name || "Unknown Repository"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Branch: {run.repositories?.branch || "main"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusColor(run.status)}>
                      {run.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Run ID</p>
                    <code className="text-xs bg-muted p-1 rounded">
                      {run.id.substring(0, 8)}...
                    </code>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {formatDuration(run.started_at, run.completed_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Progress</p>
                    <p className="font-medium">
                      {run.completed_agents}/{run.total_agents} agents
                    </p>
                    {run.total_agents > 0 && (
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${(run.completed_agents / run.total_agents) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(run.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {(run.coral_transaction_id || run.ipfs_hash) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Blockchain References</p>
                    <div className="flex gap-4 text-xs">
                      {run.coral_transaction_id && (
                        <div>
                          <span className="text-muted-foreground">Coral TX: </span>
                          <code className="bg-muted p-1 rounded">
                            {run.coral_transaction_id.substring(0, 12)}...
                          </code>
                        </div>
                      )}
                      {run.ipfs_hash && (
                        <div>
                          <span className="text-muted-foreground">IPFS: </span>
                          <code className="bg-muted p-1 rounded">
                            {run.ipfs_hash.substring(0, 12)}...
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Play className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No test runs found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No test runs match your search criteria"
                  : "Start your first test run to see results here"}
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Play className="w-4 h-4 mr-2" />
                    Start First Test Run
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}