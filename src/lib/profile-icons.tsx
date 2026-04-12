// ── Profile icon registry ─────────────────────────────────────────────────────
// Used by settings page (picker) and top-nav (renderer).

import {
  UserRound, ShieldUser, BicepsFlexed, HandMetal, Transgender, ShieldBan,
  Bird, Cat, Dog, Fish, Panda, Rabbit,
  Apple, Banana, Cherry, Drumstick, Hamburger, IceCreamCone, Pizza,
  Clover, Flame, Leaf, MountainSnow, Sprout, TreePalm,
  Atom, Biohazard, Brain, FlaskConical, Orbit, Radar, Radiation, Stethoscope, Webhook, Loader,
  Axe, Helicopter, Pickaxe, Pyramid, Rocket, Sailboat, Sword, Tent,
  ChessQueen, Crown, DollarSign, Gem, Star, Trophy,
  Annoyed, Balloon, Boxes, Bubbles, Ghost, Laugh, Nut, Origami,
  PartyPopper, Puzzle, RectangleGoggles, Skull, Toilet, VenetianMask, WandSparkles,
  ZodiacAquarius, ZodiacAries, ZodiacCancer, ZodiacCapricorn,
  ZodiacGemini, ZodiacLeo, ZodiacLibra, ZodiacPisces,
  ZodiacSagittarius, ZodiacScorpio, ZodiacTaurus, ZodiacVirgo,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export type IconName = string

export const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  // People
  UserRound, ShieldUser, BicepsFlexed, HandMetal, Transgender, ShieldBan,
  // Animals
  Bird, Cat, Dog, Fish, Panda, Rabbit,
  // Food
  Apple, Banana, Cherry, Drumstick, Hamburger, IceCreamCone, Pizza,
  // Nature
  Clover, Flame, Leaf, MountainSnow, Sprout, TreePalm,
  // Science & Tech
  Atom, Biohazard, Brain, FlaskConical, Orbit, Radar, Radiation, Webhook, Loader,
  // Adventure
  Axe, Helicopter, Pickaxe, Pyramid, Rocket, Sailboat, Sword, Tent,
  // Achievement
  ChessQueen, Crown, DollarSign, Gem, Trophy,
  // Fun
  Annoyed, Balloon, Boxes, Bubbles, Ghost, Laugh, Nut, Origami,
  PartyPopper, Puzzle, RectangleGoggles, Skull, Toilet, VenetianMask, WandSparkles,
  // Zodiac
  ZodiacAquarius, ZodiacAries, ZodiacCancer, ZodiacCapricorn,
  ZodiacGemini, ZodiacLeo, ZodiacLibra, ZodiacPisces,
  ZodiacSagittarius, ZodiacScorpio, ZodiacTaurus, ZodiacVirgo,
}

export const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  { label: 'People',        icons: ['UserRound','ShieldUser','BicepsFlexed','HandMetal','Transgender','ShieldBan'] },
  { label: 'Animals',       icons: ['Bird','Cat','Dog','Fish','Panda','Rabbit'] },
  { label: 'Food',          icons: ['Apple','Banana','Cherry','Drumstick','Hamburger','IceCreamCone','Pizza'] },
  { label: 'Nature',        icons: ['Clover','Flame','Leaf','MountainSnow','Sprout','TreePalm'] },
  { label: 'Science & Tech',icons: ['Atom','Biohazard','Brain','FlaskConical','Orbit','Radar','Radiation','Stethoscope','Webhook','Loader'] },
  { label: 'Adventure',     icons: ['Axe','Helicopter','Pickaxe','Pyramid','Rocket','Sailboat','Sword','Tent'] },
  { label: 'Achievement',   icons: ['ChessQueen','Crown','DollarSign','Gem','Star','Trophy'] },
  { label: 'Fun',           icons: ['Annoyed','Balloon','Boxes','Bubbles','Ghost','Laugh','Nut','Origami','PartyPopper','Puzzle','RectangleGoggles','Skull','Toilet','VenetianMask','WandSparkles'] },
  { label: 'Zodiac',        icons: ['ZodiacAquarius','ZodiacAries','ZodiacCancer','ZodiacCapricorn','ZodiacGemini','ZodiacLeo','ZodiacLibra','ZodiacPisces','ZodiacSagittarius','ZodiacScorpio','ZodiacTaurus','ZodiacVirgo'] },
]

export function ProfileIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICON_MAP[name]
  if (!Icon) return null
  return <Icon {...props} />
}
