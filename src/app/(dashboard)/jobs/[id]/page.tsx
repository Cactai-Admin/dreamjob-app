'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, FileText, MessageSquare, Sparkles,
  CheckCircle, Send, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { Loading } from '@/components/shared/loading'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkflowWithRelations, Output } from '@/types/database'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowWithRelations | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/workflows/${id}`).then(r => r.json()),
      fetch(`/api/workflows/${id}/outputs`).then(r => r.json()),
    ]).then(([wf, outs]) => {
      setWorkflow(wf)
      setOutputs(Array.isArray(outs) ? outs : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const startChat = async () => {
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: id }),
      })
      const data = await res.json()
      if (data.message) {
        setChatMessages([{ role: 'assistant', content: data.message }])
      }
    } catch { /* AI may not be configured */ }
    setChatLoading(false)
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: id, message: msg }),
      })
      const data = await res.json()
      if (data.message) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
      if (data.isComplete) {
        setWorkflow(prev => prev ? { ...prev, state: 'review' } : null)
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setChatLoading(false)
  }

  const generateOutput = async (type: string) => {
    setGenerating(type)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: id, output_type: type }),
      })
      const data = await res.json()
      if (res.ok) {
        setOutputs(prev => [...prev.filter(o => o.type !== type), data])
      }
    } catch { /* */ }
    setGenerating(null)
  }

  if (loading) return <Loading />
  if (!workflow) return <div className="text-center py-12 text-foreground-muted">Workflow not found</div>

  const listing = workflow.listing

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[8px] p-2 hover:bg-utility transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          title={workflow.title}
          description={`Status: ${workflow.state.replace(/_/g, ' ')}`}
        />
      </div>

      <Tabs defaultValue={workflow.state === 'qa_intake' || workflow.state === 'listing_review' ? 'qa' : 'outputs'}>
        <TabsList>
          <TabsTrigger value="listing">Listing</TabsTrigger>
          <TabsTrigger value="qa">Q&A</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        {/* Listing Tab */}
        <TabsContent value="listing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Listing
                {listing?.source_url && (
                  <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-accent">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Company</p>
                  <p className="text-sm">{listing?.company_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Title</p>
                  <p className="text-sm">{listing?.title}</p>
                </div>
                {listing?.location && (
                  <div>
                    <p className="text-xs font-medium text-foreground-muted">Location</p>
                    <p className="text-sm">{listing.location}</p>
                  </div>
                )}
                {listing?.salary_range && (
                  <div>
                    <p className="text-xs font-medium text-foreground-muted">Salary</p>
                    <p className="text-sm">{listing.salary_range}</p>
                  </div>
                )}
              </div>
              {listing?.description && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Description</p>
                  <p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.description}</p>
                </div>
              )}
              {listing?.requirements && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Requirements</p>
                  <p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Q&A Tab */}
        <TabsContent value="qa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Guided Q&A
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-foreground-muted mb-4">
                    Start the guided intake to build your application materials.
                  </p>
                  <Button onClick={startChat} disabled={chatLoading}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {chatLoading ? 'Starting...' : 'Begin Q&A'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-[12px] px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-accent text-white'
                            : 'bg-utility text-foreground'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <Skeleton className="h-16 w-3/4" />}
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your answer..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      disabled={chatLoading}
                    />
                    <Button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}>
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outputs Tab */}
        <TabsContent value="outputs">
          <div className="space-y-4">
            {['resume', 'cover_letter', 'interview_guide', 'negotiation_guide'].map(type => {
              const output = outputs.find(o => o.type === type)
              const label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

              return (
                <Card key={type}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{label}</CardTitle>
                      <div className="flex items-center gap-2">
                        {output && (
                          <Badge variant={output.state === 'ready' ? 'success' : 'secondary'}>
                            {output.state} · v{output.version}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant={output ? 'outline' : 'default'}
                          onClick={() => generateOutput(type)}
                          disabled={generating === type}
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          {generating === type ? 'Generating...' : output ? 'Regenerate' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {output && (
                    <CardContent>
                      <div className="prose prose-sm max-w-none text-foreground-muted whitespace-pre-wrap">
                        {output.content}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflow.status_events && workflow.status_events.length > 0 ? (
                  workflow.status_events.map(event => (
                    <div key={event.id} className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-sm font-medium">{event.event_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-foreground-subtle">{new Date(event.occurred_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-foreground-muted">No status events yet.</p>
                )}
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {['sent', 'interview', 'offer', 'hired', 'rejected', 'declined'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetch(`/api/workflows/${id}/status`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ event_type: status }),
                        })
                        // Refresh
                        const data = await fetch(`/api/workflows/${id}`).then(r => r.json())
                        setWorkflow(data)
                      }}
                    >
                      {status.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
