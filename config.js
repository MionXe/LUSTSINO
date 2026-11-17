// Public configuration only. The publishable key is designed for browser use with RLS.
// Never place a secret/service-role key in frontend files.
window.VYRA_CONFIG = {
  supabaseUrl: "https://ganongrsgqfnwxkfxzpu.supabase.co",
  supabaseAnonKey: "sb_publishable_1p1PioF126VEdMcg11kiuA_1PmdDxfN",
  uploadsEnabled: false, // Legacy direct-Supabase Storage writes intentionally disabled.
  uploadEndpoint: "https://ganongrsgqfnwxkfxzpu.supabase.co/functions/v1/lustsino-bunny-media", // Authenticated server-side Bunny S3 presigning. No Bunny keys in the browser.
  mediaBucket: "lustsino-media"
};
