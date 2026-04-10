'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, FileText, MessageSquare, Sparkles,
  CheckCircle, Send, ExternalLink, Save,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { Loading } from '@/components/shared/loading'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkflowWithRelations, Output } from '@/types/database'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function renderMarkdown(text: string) {
  // Simple markdown: **bold**, *italic*, line breaks, bullet lists
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bullet points
    if (line.match(/^[\-\*]\s/)) {
      const content = line.replace(/^[\-\*]\s/, '')
      return <li key={i} className="ml-4 list-disc">{formatInline(content)}</li>
    }
    // Numbered lists
    if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '')
      return <li key={i} className="ml-4 list-decimal">{formatInline(content)}</li>
    }
    // Empty line = paragraph break
    if (line.trim() === '') return <br key={i} />
    // Normal text
    return <p key={i}>{formatInline(line)}</p>
  })
}

function formatInline(text: string) {
  // Bold
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [workflow, setWorkflow] = useState<WorkflowWithRelations | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [editingListing, setEditingListing] = useState(false)
  const [listingForm, setListingForm] = useState({
    title: '', company_name: '', location: '', salary_range: '',
    employment_type: '', experience_level: '', description: '',
    requirements: '', responsibilities: '', benefits: '',
  })
  const [savingListing, setSavingListing] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/workflows/${id}`).then(r => r.json()),
      fetch(`/api/workflows/${id}/outputs`).then(r => r.json()),
    ]).then(([wf, outs]) => {
      setWorkflow(wf)
      setOutputs(Array.isArray(outs) ? outs : [])
      if (wf?.listing) {
        setListingForm({
          title: wf.listing.title || '',
          company_name: wf.listing.company_name || '',
          location: wf.listing.location || '',
          salary_range: wf.listing.salary_range || '',
          employment_type: wf.listing.employment_type || '',
          experience_level: wf.listing.experience_level || '',
          description: wf.listing.description || '',
          requirements: wf.listing.requirements || '',
          responsibilities: wf.listing.responsibilities || '',
          benefits: wf.listing.benefits || '',
        })
        // Auto-enter edit mode if listing is mostly empty (manual entry flow)
        const l = wf.listing
        if (l && !l.description && !l.requirements && !l.location) {
          setEditingListing(true)
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const saveListing = async () => {
    if (!workflow?.listing) return
    setSavingListing(true)
    await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing: listingForm }),
    })
    // Refresh workflow data
    const wf = await fetch(`/api/workflows/${id}`).then(r => r.json())
    setWorkflow(wf)
    setSavingListing(false)
    setEditingListing(false)
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[var(--radius-sm)] p-2 hover:bg-utility transition-colors duration-[var(--duration-fast)]">
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Job Listing
                  {listing?.source_url && (
                    <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-accent">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  variant={editingListing ? 'default' : 'outline'}
                  onClick={() => editingListing ? saveListing() : setEditingListing(true)}
                  disabled={savingListing}
                >
                  {editingListing ? (
                    <><Save className="mr-1 h-3 w-3" /> {savingListing ? 'Saving...' : 'Save'}</>
                  ) : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingListing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div><Label>Title</Label><Input value={listingForm.title} onChange={e => setListingForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div><Label>Company</Label><Input value={listingForm.company_name} onChange={e => setListingForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                    <div><Label>Location</Label><Input value={listingForm.location} onChange={e => setListingForm(f => ({ ...f, location: e.target.value }))} /></div>
                    <div><Label>Salary Range</Label><Input value={listingForm.salary_range} onChange={e => setListingForm(f => ({ ...f, salary_range: e.target.value }))} /></div>
                    <div><Label>Employment Type</Label><Input value={listingForm.employment_type} onChange={e => setListingForm(f => ({ ...f, employment_type: e.target.value }))} placeholder="Full-time, Part-time, Contract..." /></div>
                    <div><Label>Experience Level</Label><Input value={listingForm.experience_level} onChange={e => setListingForm(f => ({ ...f, experience_level: e.target.value }))} placeholder="Senior, Mid-level, Entry..." /></div>
                  </div>
                  <div><Label>Description</Label><textarea value={listingForm.description} onChange={e => setListingForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" rows={4} /></div>
                  <div><Label>Requirements</Label><textarea value={listingForm.requirements} onChange={e => setListingForm(f => ({ ...f, requirements: e.target.value }))} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" rows={4} /></div>
                  <div><Label>Responsibilities</Label><textarea value={listingForm.responsibilities} onChange={e => setListingForm(f => ({ ...f, responsibilities: e.target.value }))} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" rows={3} /></div>
                  <div><Label>Benefits</Label><textarea value={listingForm.benefits} onChange={e => setListingForm(f => ({ ...f, benefits: e.target.value }))} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" rows={3} /></div>
                  <Button variant="outline" size="sm" onClick={() => setEditingListing(false)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs font-medium text-foreground-muted">Company</p><p className="text-sm">{listing?.company_name || '—'}</p></div>
                    <div><p className="text-xs font-medium text-foreground-muted">Title</p><p className="text-sm">{listing?.title || '—'}</p></div>
                    <div><p className="text-xs font-medium text-foreground-muted">Location</p><p className="text-sm">{listing?.location || '—'}</p></div>
                    <div><p className="text-xs font-medium text-foreground-muted">Salary</p><p className="text-sm">{listing?.salary_range || '—'}</p></div>
                    <div><p className="text-xs font-medium text-foreground-muted">Type</p><p className="text-sm">{listing?.employment_type || '—'}</p></div>
                    <div><p className="text-xs font-medium text-foreground-muted">Level</p><p className="text-sm">{listing?.experience_level || '—'}</p></div>
                  </div>
                  {listing?.description && (
                    <div><p className="text-xs font-medium text-foreground-muted mb-1">Description</p><p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.description}</p></div>
                  )}
                  {listing?.requirements && (
                    <div><p className="text-xs font-medium text-foreground-muted mb-1">Requirements</p><p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.requirements}</p></div>
                  )}
                  {listing?.responsibilities && (
                    <div><p className="text-xs font-medium text-foreground-muted mb-1">Responsibilities</p><p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.responsibilities}</p></div>
                  )}
                  {listing?.benefits && (
                    <div><p className="text-xs font-medium text-foreground-muted mb-1">Benefits</p><p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.benefits}</p></div>
                  )}
                </>
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
                <div className="flex flex-col" style={{ height: '60vh' }}>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-[12px] px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-accent text-white'
                            : 'bg-utility text-foreground'
                        }`}>
                          {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <Skeleton className="h-12 w-3/4" />}
                    <div ref={chatEndRef} />
                  </div>
                  <Separator />
                  <div className="flex gap-2 pt-3">
                    <textarea
                      placeholder="Type your answer..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      disabled={chatLoading}
                      rows={3}
                      className="flex-1 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                    <Button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} className="self-end">
                      <Send className="h-4 w-4" />
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
                      <div className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                        {renderMarkdown(output.content)}
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
