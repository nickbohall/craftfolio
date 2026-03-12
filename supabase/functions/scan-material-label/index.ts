// scan-material-label Edge Function
// Accepts a photo of a material label, sends to Claude Haiku for extraction
// Returns structured material data for pre-filling the material entry form
//
// POST /functions/v1/scan-material-label
// Body: { image_base64: string, mime_type: string }
// Auth: Requires valid Supabase JWT
//
// TODO: Implement in material scanning feature session

export default async function handler(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}
