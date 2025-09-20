import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Search, CheckCircle, XCircle, Clock, Download, Filter, TrendingUp, Activity } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts'

interface TestResult {
  id: string
  test_run_id: string
  agent_id: string
  agent_type: string
  status: string
  result_data: any
  execution_time_ms: number | null
  logs: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  test_runs?: {
    repositories: {
      name: string
      github_url: string
    }
  }
  agents?: {
    name: string
    type: string
  }
}

export default function TestResults() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [agentTypeFilter, setAgentTypeFilter] = useState("all")
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          *,
          test_runs (
            repositories (name, github_url)
          ),
          agents (name, type)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setResults(data || [])
    } catch (error) {
      console.error("Error fetching test results:", error)
      toast({
        title: "Error",
        description: "Failed to fetch test results",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "running":
        return <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
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
      case "pending":
        return "secondary"
      case "running":
        return "default"
      default:
        return "outline"
    }
  }

  const formatExecutionTime = (timeMs: number | null) => {
    if (!timeMs) return "N/A"
    if (timeMs < 1000) return `${timeMs}ms`
    return `${(timeMs / 1000).toFixed(1)}s`
  }

  const getStats = () => {
    const total = results.length
    const completed = results.filter(r => r.status === "completed").length
    const failed = results.filter(r => r.status === "failed").length
    const pending = results.filter(r => r.status === "pending" || r.status === "running").length
    const successRate = total > 0 ? Math.round((completed / (completed + failed)) * 100) : 0

    return { total, completed, failed, pending, successRate }
  }

  const getChartData = () => {
    // Agent performance data
    const agentTypes = [...new Set(results.map(r => r.agent_type))]
    const agentPerformance = agentTypes.map(type => {
      const agentResults = results.filter(r => r.agent_type === type)
      const completed = agentResults.filter(r => r.status === "completed").length
      const failed = agentResults.filter(r => r.status === "failed").length
      const avgTime = agentResults.reduce((acc, r) => acc + (r.execution_time_ms || 0), 0) / agentResults.length
      
      return {
        name: type.replace('Agent', '').replace(/([A-Z])/g, ' $1').trim(),
        completed,
        failed,
        total: agentResults.length,
        avgTime: Math.round(avgTime)
      }
    })

    // Status distribution
    const statusData = [
      { name: 'Completed', value: results.filter(r => r.status === "completed").length, color: '#10b981' },
      { name: 'Failed', value: results.filter(r => r.status === "failed").length, color: '#ef4444' },
      { name: 'Pending', value: results.filter(r => r.status === "pending" || r.status === "running").length, color: '#f59e0b' },
    ].filter(item => item.value > 0)

    // Timeline data (last 7 days)
    const timelineData = Array.from({length: 7}, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayResults = results.filter(r => {
        const resultDate = new Date(r.created_at)
        return resultDate.toDateString() === date.toDateString()
      })
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: dayResults.filter(r => r.status === "completed").length,
        failed: dayResults.filter(r => r.status === "failed").length,
        total: dayResults.length
      }
    })

    return { agentPerformance, statusData, timelineData }
  }

  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.agents?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.test_runs?.repositories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || result.status === statusFilter
    const matchesAgentType = agentTypeFilter === "all" || result.agent_type === agentTypeFilter
    
    return matchesSearch && matchesStatus && matchesAgentType
  })

  const stats = getStats()
  const chartData = getChartData()

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
          <h1 className="text-3xl font-bold text-foreground">Test Results</h1>
          <p className="text-muted-foreground mt-2">
            View and analyze test execution results
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Results
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{stats.successRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      {results.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ color: '#333' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Agent Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Agent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ color: '#333' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                    />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" />
                    <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                7-Day Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ color: '#333' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10b981" 
                      name="Completed"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="failed" 
                      stroke="#ef4444" 
                      name="Failed"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search results..."
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
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
          </SelectContent>
        </Select>
        <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Agent Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="repoClonerAgent">Repo Cloner</SelectItem>
            <SelectItem value="fuzzAgent">Fuzz Testing</SelectItem>
            <SelectItem value="unitTestAgent">Unit Tests</SelectItem>
            <SelectItem value="integrationAgent">Integration</SelectItem>
            <SelectItem value="mistralBugReasoningAgent">Bug Analysis</SelectItem>
            <SelectItem value="securityAgent">Security</SelectItem>
            <SelectItem value="aggregatorAgent">Aggregator</SelectItem>
            <SelectItem value="blockchainLogger">Blockchain</SelectItem>
            <SelectItem value="voiceQAagent">Voice QA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Table */}
      <div className="space-y-4">
        {filteredResults.length > 0 ? (
          filteredResults.map((result) => (
            <Card key={result.id} className="border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedResult(result)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {result.agents?.name || `Agent ${result.agent_id.substring(0, 8)}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Repository: {result.test_runs?.repositories?.name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {result.agent_type}
                    </Badge>
                    <Badge variant={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Execution Time</p>
                    <p className="font-medium">
                      {formatExecutionTime(result.execution_time_ms)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">
                      {result.started_at 
                        ? new Date(result.started_at).toLocaleDateString()
                        : "Not started"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="font-medium">
                      {result.completed_at 
                        ? new Date(result.completed_at).toLocaleDateString()
                        : "In progress"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Result ID</p>
                    <code className="text-xs bg-muted p-1 rounded">
                      {result.id.substring(0, 8)}...
                    </code>
                  </div>
                </div>

                {result.result_data && Object.keys(result.result_data).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Result Summary</p>
                    <div className="text-xs bg-muted p-2 rounded-md">
                      {result.result_data.error ? (
                        <div className="text-red-600 font-medium">
                          Error: {result.result_data.error}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-muted-foreground">
                          {JSON.stringify(result.result_data, null, 2).substring(0, 200)}
                          {JSON.stringify(result.result_data, null, 2).length > 200 ? "..." : ""}
                        </pre>
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
              <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== "all" || agentTypeFilter !== "all"
                  ? "No results match your search criteria"
                  : "Run some tests to see results here"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result Details Dialog */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
             onClick={() => setSelectedResult(null)}>
          <div className="bg-background border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Test Result Details</h2>
                <Button variant="ghost" onClick={() => setSelectedResult(null)}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="data">Result Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Agent Information</h4>
                      <p><span className="text-muted-foreground">Name:</span> {selectedResult.agents?.name}</p>
                      <p><span className="text-muted-foreground">Type:</span> {selectedResult.agent_type}</p>
                      <p><span className="text-muted-foreground">ID:</span> {selectedResult.agent_id}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Execution Details</h4>
                      <p><span className="text-muted-foreground">Status:</span> {selectedResult.status}</p>
                      <p><span className="text-muted-foreground">Duration:</span> {formatExecutionTime(selectedResult.execution_time_ms)}</p>
                      <p><span className="text-muted-foreground">Started:</span> {selectedResult.started_at ? new Date(selectedResult.started_at).toLocaleString() : "Not started"}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="logs">
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">
                      {selectedResult.logs || "No logs available"}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="data">
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(selectedResult.result_data, null, 2) || "No result data available"}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}