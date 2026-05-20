/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PREVIEW_BYPASS?: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_SUPABASE_URL?: string;
  readonly VITE_APP_SUPABASE_ANON_KEY?: string;
  readonly VITE_APP_MAPBOX?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_GA4_MEASUREMENT_ID?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_META_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}
