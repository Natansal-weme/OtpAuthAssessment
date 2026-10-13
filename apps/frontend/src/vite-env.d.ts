/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin. Leave empty in development to go through the Vite proxy (same origin). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
