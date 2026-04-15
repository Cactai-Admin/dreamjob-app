import type { Workflow } from "@/lib/types";

export const PREP_STATES = new Set(["qa_intake", "draft", "active", "review", "ready"]);
export const DOC_STATES = new Set(["generating", "review", "ready_to_send"]);
export const SENT_STATES = new Set(["sent", "completed"]);

export function labelForState(state: string) {
  if (state === "listing_review") return "Listing Analysis";
  if (PREP_STATES.has(state)) return "Application Preparation";
  if (DOC_STATES.has(state)) return "Resume/Cover Letter Analysis";
  if (SENT_STATES.has(state)) return "Sent";
  if (state === "archived") return "Archive";
  return state;
}

export function routeForWorkflow(workflow: Workflow) {
  if (workflow.state === "listing_review") return `/listings/${workflow.id}`;
  if (workflow.state === "archived") return `/archive?workflow=${workflow.id}`;
  return `/jobs/${workflow.id}`;
}

export function splitContinuity(workflows: Workflow[]) {
  const listings = workflows.filter((workflow) => workflow.state === "listing_review");
  const applications = workflows.filter((workflow) => workflow.state !== "listing_review");
  return { listings, applications };
}
