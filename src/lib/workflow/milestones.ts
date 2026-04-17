export type CoreMilestone = 'work_history' | 'resume' | 'cover_letter' | 'final_hub'
export type MilestoneVisualState = 'inactive' | 'active' | 'complete'

export function getMilestoneVisualState(
  milestone: CoreMilestone,
  activeMilestone: CoreMilestone,
  completedMilestones: CoreMilestone[]
): MilestoneVisualState {
  if (completedMilestones.includes(milestone)) return 'complete'
  if (milestone === activeMilestone) return 'active'
  return 'inactive'
}

export function getMilestoneClasses(state: MilestoneVisualState): string {
  switch (state) {
    case 'active':
      return 'text-blue-700 border-blue-400 bg-blue-50'
    case 'complete':
      return 'text-green-700 border-green-400 bg-green-50'
    default:
      return 'text-slate-400 border-slate-200 bg-white'
  }
}
