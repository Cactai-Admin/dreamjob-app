import type { ArtifactType, NativeDocument } from '@/lib/documents/native-document'
import { toPlainText } from '@/lib/documents/native-document'

type SyncStatus = 'synced' | 'pending' | 'error'

type GoogleDocRecord = {
  artifactType: ArtifactType
  documentId: string
  documentUrl: string
  syncedAt: string
  syncState: SyncStatus
  error?: string
}

export type GoogleSyncSnapshot = {
  listingFolderId?: string
  listingFolderUrl?: string
  timezone?: string
  docs?: Partial<Record<ArtifactType, GoogleDocRecord>>
}

export type SyncResult = {
  status: SyncStatus
  message: string
  documentId?: string
  documentUrl?: string
  listingFolderId?: string
  listingFolderUrl?: string
  timezone?: string
}

function inferTimezoneFromLocation(location: string | null | undefined): string {
  const value = (location ?? '').toLowerCase()
  if (!value) return 'America/New_York'
  if (value.includes('los angeles') || value.includes('san francisco') || value.includes('seattle') || value.includes('pst') || value.includes('pdt')) return 'America/Los_Angeles'
  if (value.includes('denver') || value.includes('phoenix') || value.includes('mst') || value.includes('mdt')) return 'America/Denver'
  if (value.includes('chicago') || value.includes('austin') || value.includes('dallas') || value.includes('houston') || value.includes('cst') || value.includes('cdt')) return 'America/Chicago'
  return 'America/New_York'
}

function formatFolderTimestamp(timezone: string): string {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'

  return `${date} ${hour}-${minute}`
}

async function googleFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(`Google API ${res.status}: ${message}`)
  }

  return res.json() as Promise<T>
}

async function ensureListingFolder(params: {
  accessToken: string
  rootFolderId: string
  listingName: string
  timezone: string
  existingFolderId?: string
}) {
  if (params.existingFolderId) {
    return {
      id: params.existingFolderId,
      url: `https://drive.google.com/drive/folders/${params.existingFolderId}`,
    }
  }

  const folderName = `${params.listingName} ${formatFolderTimestamp(params.timezone)}`
  const folder = await googleFetch<{ id: string }>('https://www.googleapis.com/drive/v3/files', params.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [params.rootFolderId],
    }),
  })

  return {
    id: folder.id,
    url: `https://drive.google.com/drive/folders/${folder.id}`,
  }
}

async function ensureGoogleDoc(params: {
  accessToken: string
  listingFolderId: string
  existingDocId?: string
  title: string
}) {
  if (params.existingDocId) {
    return {
      id: params.existingDocId,
      url: `https://docs.google.com/document/d/${params.existingDocId}/edit`,
    }
  }

  const created = await googleFetch<{ documentId: string }>('https://docs.googleapis.com/v1/documents', params.accessToken, {
    method: 'POST',
    body: JSON.stringify({ title: params.title }),
  })

  await googleFetch(
    `https://www.googleapis.com/drive/v3/files/${created.documentId}?addParents=${params.listingFolderId}&fields=id,parents`,
    params.accessToken,
    { method: 'PATCH' },
  )

  return {
    id: created.documentId,
    url: `https://docs.google.com/document/d/${created.documentId}/edit`,
  }
}

async function overwriteDocContent(accessToken: string, documentId: string, document: NativeDocument) {
  const plainText = toPlainText(document)
  const current = await googleFetch<{ body?: { content?: Array<{ endIndex?: number }> } }>(
    `https://docs.googleapis.com/v1/documents/${documentId}`,
    accessToken,
  )

  const endIndex = current.body?.content?.[current.body.content.length - 1]?.endIndex
  const requests: Array<Record<string, unknown>> = []

  if (typeof endIndex === 'number' && endIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    })
  }

  requests.push({
    insertText: {
      location: { index: 1 },
      text: `${plainText}\n`,
    },
  })

  await googleFetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests }),
    },
  )
}

export async function syncDocumentToGoogleDocs(params: {
  accessToken?: string | null
  artifactType: ArtifactType
  listingName: string
  profileLocation?: string | null
  rootFolderId?: string | null
  existingSync?: GoogleSyncSnapshot | null
  document: NativeDocument
}) {
  const timezone = inferTimezoneFromLocation(params.profileLocation)

  if (!params.accessToken) {
    return {
      result: {
        status: 'pending',
        message: 'Google account is connected without a Drive/Docs token. Re-authenticate to enable sync.',
        timezone,
      } satisfies SyncResult,
      snapshot: params.existingSync ?? { timezone },
    }
  }

  if (!params.rootFolderId) {
    return {
      result: {
        status: 'pending',
        message: 'Choose a Google Drive root folder in Settings to enable Google Docs sync.',
        timezone,
      } satisfies SyncResult,
      snapshot: params.existingSync ?? { timezone },
    }
  }

  const existing = params.existingSync ?? {}

  try {
    const folder = await ensureListingFolder({
      accessToken: params.accessToken,
      rootFolderId: params.rootFolderId,
      listingName: params.listingName,
      timezone,
      existingFolderId: existing.listingFolderId,
    })

    const existingDocId = existing.docs?.[params.artifactType]?.documentId
    const doc = await ensureGoogleDoc({
      accessToken: params.accessToken,
      listingFolderId: folder.id,
      existingDocId,
      title: `${params.listingName} — ${params.artifactType.replace('_', ' ')}`,
    })

    await overwriteDocContent(params.accessToken, doc.id, params.document)

    const syncedAt = new Date().toISOString()
    const nextSnapshot: GoogleSyncSnapshot = {
      timezone,
      listingFolderId: folder.id,
      listingFolderUrl: folder.url,
      docs: {
        ...(existing.docs ?? {}),
        [params.artifactType]: {
          artifactType: params.artifactType,
          documentId: doc.id,
          documentUrl: doc.url,
          syncedAt,
          syncState: 'synced',
        },
      },
    }

    return {
      result: {
        status: 'synced',
        message: 'Synced to Google Docs.',
        documentId: doc.id,
        documentUrl: doc.url,
        listingFolderId: folder.id,
        listingFolderUrl: folder.url,
        timezone,
      } satisfies SyncResult,
      snapshot: nextSnapshot,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync with Google Docs.'
    const nextSnapshot: GoogleSyncSnapshot = {
      ...(existing ?? {}),
      timezone,
      docs: {
        ...(existing.docs ?? {}),
        [params.artifactType]: {
          artifactType: params.artifactType,
          documentId: existing.docs?.[params.artifactType]?.documentId ?? '',
          documentUrl: existing.docs?.[params.artifactType]?.documentUrl ?? '',
          syncedAt: new Date().toISOString(),
          syncState: 'error',
          error: message,
        },
      },
    }

    return {
      result: {
        status: 'error',
        message,
        timezone,
      } satisfies SyncResult,
      snapshot: nextSnapshot,
    }
  }
}
