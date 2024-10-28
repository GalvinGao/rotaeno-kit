/// <reference types="vite/client" />

import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta {
    header?: {
      inset?: boolean
    }
  }
}
