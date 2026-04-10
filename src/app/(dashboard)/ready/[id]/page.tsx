'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Copy, Download, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { Loading } from '@/components/shared/loading'
import type { WorkflowWithRelations, Output } from '@/types/database'

export default function ReadyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowWithRelations | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)

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

  const copyToClipboard = async (content: string, outputId: string) => {
    await navigator.clipboard.writeText(content)
    // Log the copy action
    await fetch(`/api/workflows/${id}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output_id: outputId, action: 'copy' }),
    })
  }

  const markAsSent = async () => {
    await fetch(`/api/workflows/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'sent' }),
    })
    router.push(`/sent/${id}`)
  }

  if (loading) return <Loading />
  if (!workflow) return <div className="text-center py-12 text-foreground-muted">Not found</div>

  const resume = outputs.find(o => o.type === 'resume')
  const coverLetter = outputs.find(o => o.type === 'cover_letter')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[var(--radius-sm)] p-2 hover:bg-utility transition-colors duration-[var(--duration-fast)]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          title={workflow.title}
          actions={
            <Button onClick={markAsSent}>
              <Send className="mr-2 h-4 w-4" />
              Mark as Sent
            </Button>
          }
        />
      </div>

      {[
        { label: 'Resume', output: resume },
        { label: 'Cover Letter', output: coverLetter },
      ].map(({ label, output }) => (
        <Card key={label}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{label}</CardTitle>
              {output && (
                <div className="flex items-center gap-2">
                  <Badge variant={output.state === 'ready' ? 'success' : 'secondary'}>
                    {output.state}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(output.content, output.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          {output && (
            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-foreground-muted">{output.content}</div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
