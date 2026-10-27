/// <reference types="vite/client" />

import type { SuixuApi } from '../../preload'

declare global {
  interface Window {
    suixu: SuixuApi
  }
}

export {}
