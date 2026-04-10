import { cn } from '@/lib/utils'

interface LoadingProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
  fullPage?: boolean
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  default: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
}

export function Loading({ className, size = 'default', fullPage }: LoadingProps) {
  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-foreground-subtle border-t-accent',
        sizes[size],
        className
      )}
    />
  )

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-8">
      {spinner}
    </div>
  )
}
