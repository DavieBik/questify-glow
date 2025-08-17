import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentedTabItem {
  id: string
  label: string
  icon?: React.ReactNode
}

export interface SegmentedTabsProps {
  items: SegmentedTabItem[]
  value: string
  onChange: (id: string) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
}

export const SegmentedTabs = React.forwardRef<
  HTMLDivElement,
  SegmentedTabsProps
>(({ items, value, onChange, size = 'md', fullWidth = false, className }, ref) => {
  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex
    
    switch (event.key) {
      case 'ArrowLeft':
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
        break
      case 'ArrowRight':
        newIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1
        break
      case 'Home':
        newIndex = 0
        break
      case 'End':
        newIndex = items.length - 1
        break
      default:
        return
    }
    
    event.preventDefault()
    onChange(items[newIndex].id)
  }

  return (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "inline-flex items-center rounded-full bg-muted p-1 text-muted-foreground",
        fullWidth && "w-full",
        className
      )}
    >
      {items.map((item, index) => {
        const isActive = value === item.id
        const currentIndex = items.findIndex(i => i.id === value)
        
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            data-testid={`seg-${item.label}`}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-60",
              // Size variants
              size === 'sm' ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              // State variants - canonical Group Projects style
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "bg-muted text-muted-foreground hover:bg-muted/80",
              fullWidth && "flex-1"
            )}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, currentIndex)}
          >
            {item.icon && (
              <span className={cn("flex-shrink-0", item.label && "mr-2")}>
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        )
      })}
    </div>
  )
})
SegmentedTabs.displayName = "SegmentedTabs"