import type { Output } from '@/lib/types'

export type ArtifactType = 'resume' | 'cover_letter' | 'interview_guide' | 'negotiation_guide'

export interface NativeDocumentSection {
  id: string
  title: string
  content: string
}

export interface NativeDocument {
  schema: 'dreamjob.native-document.v1'
  artifactType: ArtifactType
  sections: NativeDocumentSection[]
}

const DEFAULT_TITLES: Record<ArtifactType, string> = {
  resume: 'Resume',
  cover_letter: 'Cover Letter',
  interview_guide: 'Interview Guide',
  negotiation_guide: 'Negotiation Guide',
}

function normalizeSections(sections: NativeDocumentSection[], fallbackTitle: string): NativeDocumentSection[] {
  return sections
    .map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      title: section.title || (index === 0 ? fallbackTitle : `Section ${index + 1}`),
      content: section.content ?? '',
    }))
    .filter((section) => section.title.trim() || section.content.trim())
}

export function createDefaultDocument(artifactType: ArtifactType, content = ''): NativeDocument {
  return {
    schema: 'dreamjob.native-document.v1',
    artifactType,
    sections: [{ id: 'main', title: DEFAULT_TITLES[artifactType], content }],
  }
}

export function parseNativeDocument(artifactType: ArtifactType, output?: Output | null): NativeDocument {
  if (!output?.content) return createDefaultDocument(artifactType)

  try {
    const parsed = JSON.parse(output.content) as unknown

    if (
      parsed
      && typeof parsed === 'object'
      && 'schema' in parsed
      && (parsed as { schema?: string }).schema === 'dreamjob.native-document.v1'
      && Array.isArray((parsed as { sections?: unknown[] }).sections)
    ) {
      const typed = parsed as NativeDocument
      return {
        schema: 'dreamjob.native-document.v1',
        artifactType,
        sections: normalizeSections(typed.sections, DEFAULT_TITLES[artifactType]),
      }
    }

    if (Array.isArray(parsed)) {
      return {
        schema: 'dreamjob.native-document.v1',
        artifactType,
        sections: normalizeSections(parsed as NativeDocumentSection[], DEFAULT_TITLES[artifactType]),
      }
    }
  } catch {
    // fallback below
  }

  return createDefaultDocument(artifactType, output.content)
}

export function serializeNativeDocument(document: NativeDocument): string {
  return JSON.stringify(document)
}

export function toPlainText(document: NativeDocument): string {
  return document.sections
    .map((section) => {
      const title = section.title.trim()
      const body = section.content.trim()
      if (!title && !body) return ''
      if (!body) return title
      return `${title}\n${body}`
    })
    .filter(Boolean)
    .join('\n\n')
}

export function getPrimarySectionText(document: NativeDocument): string {
  return document.sections.map((section) => section.content).join('\n\n').trim()
}

export function setPrimarySectionText(document: NativeDocument, text: string): NativeDocument {
  const nextSections = document.sections.length > 0
    ? document.sections.map((section, index) => (index === 0 ? { ...section, content: text } : section))
    : [{ id: 'main', title: DEFAULT_TITLES[document.artifactType], content: text }]

  return {
    ...document,
    sections: normalizeSections(nextSections, DEFAULT_TITLES[document.artifactType]),
  }
}
