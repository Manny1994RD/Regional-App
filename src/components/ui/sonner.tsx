import * as React from "react"
import { Toaster as Sonner } from "sonner"

export type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Wrapper to match shadcn/ui import path: "@/components/ui/sonner"
 * Usage in App.tsx:  <Toaster richColors position="top-right" />
 */
export function Toaster(props: ToasterProps) {
  return <Sonner {...props} />
}

export default Toaster
