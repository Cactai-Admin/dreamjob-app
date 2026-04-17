import type { StatusEvent, Workflow } from "@/lib/types";

interface InterviewMeta {
  date?: string;
  time?: string;
}

interface OfferMeta {
  amount?: string;
  details?: string;
}

function parseEventNotes<T>(notes: string | null | undefined): T {
  if (!notes) return {} as T;
  try {
    const parsed = JSON.parse(notes) as T;
    return parsed ?? ({} as T);
  } catch {
    return {} as T;
  }
}

export function readInterviewMeta(notes: string | null | undefined): InterviewMeta {
  return parseEventNotes<InterviewMeta>(notes);
}

export function readOfferMeta(notes: string | null | undefined): OfferMeta {
  return parseEventNotes<OfferMeta>(notes);
}

export function getStatusEvent(events: StatusEvent[] | undefined, eventType: string): StatusEvent | undefined {
  return (events ?? []).find((event) => event.event_type === eventType);
}

export function getWorkflowSupportState(workflow: Workflow | null) {
  const resumeSaved = Boolean(workflow?.outputs?.find((o) => o.type === "resume" && o.is_current));
  const coverSaved = Boolean(workflow?.outputs?.find((o) => o.type === "cover_letter" && o.is_current));
  const supportUnlocked = resumeSaved && coverSaved;
  const interviewEvent = getStatusEvent(workflow?.status_events, "interview_scheduled");
  const offerEvent = getStatusEvent(workflow?.status_events, "offer_received");
  const interviewMeta = readInterviewMeta(interviewEvent?.notes);
  const offerMeta = readOfferMeta(offerEvent?.notes);
  const interviewUnlocked = supportUnlocked && Boolean(interviewMeta.date && interviewMeta.time);
  const negotiationUnlocked = supportUnlocked && Boolean(offerMeta.amount && offerMeta.details);

  return {
    resumeSaved,
    coverSaved,
    supportUnlocked,
    interviewMeta,
    offerMeta,
    interviewUnlocked,
    negotiationUnlocked,
  };
}
