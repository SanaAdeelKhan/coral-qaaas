import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bot, GitBranch, Play, BarChart3, Plus, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Link } from "react-router-dom"

interface DashboardStats {
  totalAgents: number
  totalRepositories: number
  totalTestRuns: number
  activeTestRuns: number
  successfulTests: number
  failedTests: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    totalRepositories: 0,
    totalTestRuns: 0,
    activeTestRuns: 0,
    successfulTests: 0,
    failedTests: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch basic counts
      const [agentsData, repositoriesData, testRunsData, testResultsData] = await Promise.all([
        supabase.from("agents").select("*", { count: "exact" }),
        supabase.from("repositories").select("*", { count: "exact" }),
        supabase.from("test_runs").select("*", { count: "exact" }),
        supabase.from("test_results").select("*")
      ])

      // Fetch recent test runs for activity
      const { data: recentRuns } = await supabase
        .from("test_runs")
        .select(`
          *,
          repositories (name, github_url)
        `)
        .order("created_at", { ascending: false })
        .limit(5)

      const activeRuns = testRunsData.data?.filter(run => run.status === "running" || run.status === "queued").length || 0
      const successfulTests = testResultsData.data?.filter(result => result.status === "completed").length || 0
      const failedTests = testResultsData.data?.filter(result => result.status === "failed").length || 0

      setStats({
        totalAgents: agentsData.count || 0,
        totalRepositories: repositoriesData.count || 0,
        totalTestRuns: testRunsData.count || 0,
        activeTestRuns: activeRuns,
        successfulTests,
        failedTests,
      })

      setRecentActivity(recentRuns || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  const statCards = [
    {
      title: "Total Agents",
      value: stats.totalAgents,
      icon: Bot,
      description: "Registered testing agents",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Repositories",
      value: stats.totalRepositories,
      icon: GitBranch,
      description: "Connected repositories",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Test Runs",
      value: stats.totalTestRuns,
      icon: Play,
      description: "Total test executions",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Success Rate",
      value: stats.totalTestRuns > 0 
        ? Math.round((stats.successfulTests / (stats.successfulTests + stats.failedTests)) * 100) 
        : 0,
      suffix: "%",
      icon: TrendingUp,
      description: "Test success percentage",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your agent testing platform
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/test-runs">
              <Play className="w-4 h-4 mr-2" />
              New Test Run
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {card.value}{card.suffix}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Test Activity</CardTitle>
            <CardDescription>Latest test runs and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {run.repositories?.name || "Unknown Repository"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(run.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      run.status === "completed" ? "default" :
                      run.status === "failed" ? "destructive" :
                      run.status === "running" ? "secondary" : "outline"
                    }>
                      {run.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent test runs found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/agents">
                <Bot className="w-4 h-4 mr-2" />
                Register New Agent
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/repositories">
                <GitBranch className="w-4 h-4 mr-2" />
                Add Repository
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/test-runs">
                <Play className="w-4 h-4 mr-2" />
                Start Test Run
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/results">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Results
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {stats.activeTestRuns > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              Active Test Runs
            </CardTitle>
            <CardDescription>
              {stats.activeTestRuns} test run(s) currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/test-runs">
                View Active Runs
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}