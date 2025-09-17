import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { GitBranch, Plus, ExternalLink, Trash2, Search, Settings } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Repository {
  id: string
  name: string
  github_url: string
  branch: string
  clone_url: string | null
  owner_id: string | null
  metadata: any
  created_at: string
  updated_at: string
}

export default function Repositories() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newRepo, setNewRepo] = useState({
    name: "",
    github_url: "",
    branch: "main",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    try {
      const { data, error } = await supabase
        .from("repositories")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setRepositories(data || [])
    } catch (error) {
      console.error("Error fetching repositories:", error)
      toast({
        title: "Error",
        description: "Failed to fetch repositories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRepository = async () => {
    try {
      // Extract repo name from GitHub URL if not provided
      let repoName = newRepo.name
      if (!repoName && newRepo.github_url) {
        const matches = newRepo.github_url.match(/github\.com\/[^\/]+\/([^\/]+)/)
        repoName = matches ? matches[1].replace('.git', '') : ''
      }

      const { data, error } = await supabase
        .from("repositories")
        .insert([
          {
            name: repoName,
            github_url: newRepo.github_url,
            branch: newRepo.branch,
            clone_url: newRepo.github_url.endsWith('.git') ? newRepo.github_url : `${newRepo.github_url}.git`,
            metadata: { auto_added: true }
          },
        ])

      if (error) throw error

      toast({
        title: "Success",
        description: "Repository added successfully",
      })

      setNewRepo({
        name: "",
        github_url: "",
        branch: "main",
      })
      setIsAddDialogOpen(false)
      fetchRepositories()
    } catch (error) {
      console.error("Error adding repository:", error)
      toast({
        title: "Error",
        description: "Failed to add repository",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRepository = async (id: string) => {
    if (!confirm("Are you sure you want to delete this repository?")) return

    try {
      const { error } = await supabase.from("repositories").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Repository deleted successfully",
      })
      fetchRepositories()
    } catch (error) {
      console.error("Error deleting repository:", error)
      toast({
        title: "Error",
        description: "Failed to delete repository",
        variant: "destructive",
      })
    }
  }

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.github_url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const extractOwnerRepo = (url: string) => {
    const matches = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    return matches ? { owner: matches[1], repo: matches[2].replace('.git', '') } : null
  }

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
          <h1 className="text-3xl font-bold text-foreground">Repositories</h1>
          <p className="text-muted-foreground mt-2">
            Manage repositories for automated testing
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Repository</DialogTitle>
              <DialogDescription>
                Connect a GitHub repository to the testing platform
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="github_url" className="text-right">
                  GitHub URL *
                </Label>
                <Input
                  id="github_url"
                  value={newRepo.github_url}
                  onChange={(e) => setNewRepo({ ...newRepo, github_url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://github.com/owner/repo"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newRepo.name}
                  onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Auto-extracted from URL"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch" className="text-right">
                  Branch
                </Label>
                <Input
                  id="branch"
                  value={newRepo.branch}
                  onChange={(e) => setNewRepo({ ...newRepo, branch: e.target.value })}
                  className="col-span-3"
                  placeholder="main"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddRepository} disabled={!newRepo.github_url}>
                Add Repository
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRepositories.length > 0 ? (
          filteredRepositories.map((repo) => {
            const ownerRepo = extractOwnerRepo(repo.github_url)
            return (
              <Card key={repo.id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      <CardTitle className="text-lg truncate">{repo.name}</CardTitle>
                    </div>
                    <Badge variant="outline">
                      {repo.branch}
                    </Badge>
                  </div>
                  {ownerRepo && (
                    <CardDescription>
                      {ownerRepo.owner}/{ownerRepo.repo}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">GitHub URL</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted p-1 rounded flex-1 truncate">
                        {repo.github_url}
                      </code>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={repo.github_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {repo.clone_url && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Clone URL</p>
                      <code className="text-xs bg-muted p-1 rounded block truncate">
                        {repo.clone_url}
                      </code>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(repo.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRepository(repo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full">
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No repositories found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm
                    ? "No repositories match your search criteria"
                    : "Connect your first repository to start testing"}
                </p>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Repository
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}