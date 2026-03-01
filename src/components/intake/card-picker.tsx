'use client'

import {
  Sword,
  Heart,
  Zap,
  Rocket,
  BookOpen,
  Flame,
  Crown,
  Fingerprint,
  HeartCrack,
  Shield,
  Moon,
  Cloud,
  Feather,
  Building,
  Clock,
  Globe2,
  Trees,
  Orbit,
  Compass,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Icon lookup map — covers all icons used in the static data files
const ICON_MAP: Record<string, LucideIcon> = {
  Sword,
  Heart,
  Zap,
  Rocket,
  BookOpen,
  Flame,
  Crown,
  Fingerprint,
  HeartCrack,
  Shield,
  Moon,
  Cloud,
  Feather,
  Building,
  Clock,
  Globe2,
  Trees,
  Orbit,
  Compass,
}

export interface CardOption {
  id: string
  label: string
  description?: string
  icon?: string
}

interface CardPickerProps {
  options: CardOption[]
  selected: string | string[]
  multiSelect?: boolean
  onSelect: (id: string) => void
  columns?: 2 | 3
}

export function CardPicker({
  options,
  selected,
  multiSelect = false,
  onSelect,
  columns = 3,
}: CardPickerProps) {
  const isSelected = (id: string): boolean => {
    if (Array.isArray(selected)) {
      return selected.includes(id)
    }
    return selected === id
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3',
        columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
      )}
    >
      {options.map((option) => {
        const active = isSelected(option.id)
        const IconComponent = option.icon ? ICON_MAP[option.icon] : undefined

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={active}
            className={cn(
              'relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
              active
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            {/* Multi-select checkbox indicator */}
            {multiSelect && (
              <span
                className={cn(
                  'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background'
                )}
                aria-hidden="true"
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            )}

            {/* Single-select check mark */}
            {!multiSelect && active && (
              <span
                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}

            {/* Icon */}
            {IconComponent && (
              <IconComponent
                className={cn(
                  'h-6 w-6',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-hidden="true"
              />
            )}

            {/* Label */}
            <span className="font-medium leading-snug">{option.label}</span>

            {/* Description */}
            {option.description && (
              <span className="text-sm text-muted-foreground leading-snug">
                {option.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
