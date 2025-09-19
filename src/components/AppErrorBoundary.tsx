import React from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div style={{ padding: 16, border: '1px solid #f00', background: '#fff5f5' }}>
      <h3 style={{ color: '#c00', marginTop: 0 }}>Something went wrong</h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error?.message || error)}</pre>
      <button onClick={resetErrorBoundary} style={{ marginTop: 8, padding: '6px 10px' }}>
        Try again
      </button>
    </div>
  )
}

export default function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, info) => {
        console.error('[AppErrorBoundary] error:', error)
        console.error('[AppErrorBoundary] componentStack:', info.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
