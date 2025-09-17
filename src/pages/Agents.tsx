import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bot, Plus, ExternalLink, Settings, Trash2, Search } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Agent {
  id: string
  name: string
  type: string
  endpoint_url: string
  status: string
  capabilities: any
  metadata: any
  coral_agent_id?: string
  created_at: string
  updated_at: string
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: "",
    type: "mistral",
    endpoint_url: "",
    capabilities: "",
    metadata: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (error) {
      console.error("Error fetching agents:", error)
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAgent = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .insert([
          {
            name: newAgent.name,
            type: newAgent.type,
            endpoint_url: newAgent.endpoint_url,
            capabilities: newAgent.capabilities ? JSON.parse(newAgent.capabilities) : {},
            metadata: newAgent.metadata ? JSON.parse(newAgent.metadata) : {},
          },
        ])

      if (error) throw error

      toast({
        title: "Success",
        description: "Agent added successfully",
      })

      setNewAgent({
        name: "",
        type: "mistral",
        endpoint_url: "",
        capabilities: "",
        metadata: "",
      })
      setIsAddDialogOpen(false)
      fetchAgents()
    } catch (error) {
      console.error("Error adding agent:", error)
      toast({
        title: "Error",
        description: "Failed to add agent",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return

    try {
      const { error } = await supabase.from("agents").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Agent deleted successfully",
      })
      fetchAgents()
    } catch (error) {
      console.error("Error deleting agent:", error)
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      })
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getTypeIcon = (type: string) => {
    return <Bot className="w-4 h-4" />
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
          <h1 className="text-3xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-2">
            Manage your testing agents and their configurations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
              <DialogDescription>
                Register a new testing agent to the platform
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Agent name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newAgent.type}
                  onValueChange={(value) => setNewAgent({ ...newAgent, type: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mistral">Mistral AI</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endpoint" className="text-right">
                  Endpoint
                </Label>
                <Input
                  id="endpoint"
                  value={newAgent.endpoint_url}
                  onChange={(e) => setNewAgent({ ...newAgent, endpoint_url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://api.example.com/agent"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capabilities" className="text-right">
                  Capabilities
                </Label>
                <Textarea
                  id="capabilities"
                  value={newAgent.capabilities}
                  onChange={(e) => setNewAgent({ ...newAgent, capabilities: e.target.value })}
                  className="col-span-3"
                  placeholder='{"language": "javascript", "framework": "react"}'
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="metadata" className="text-right">
                  Metadata
                </Label>
                <Textarea
                  id="metadata"
                  value={newAgent.metadata}
                  onChange={(e) => setNewAgent({ ...newAgent, metadata: e.target.value })}
                  className="col-span-3"
                  placeholder='{"description": "Test agent for React apps"}'
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddAgent} disabled={!newAgent.name || !newAgent.endpoint_url}>
                Add Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.length > 0 ? (
          filteredAgents.map((agent) => (
            <Card key={agent.id} className="border-border hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(agent.type)}
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  <Badge variant={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>
                <CardDescription>
                  {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Endpoint</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted p-1 rounded flex-1 truncate">
                      {agent.endpoint_url}
                    </code>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {agent.coral_agent_id && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Coral Agent ID</p>
                    <code className="text-xs bg-muted p-1 rounded block">
                      {agent.coral_agent_id}
                    </code>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(agent.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No agents found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm
                    ? "No agents match your search criteria"
                    : "Get started by adding your first testing agent"}
                </p>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Agent
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