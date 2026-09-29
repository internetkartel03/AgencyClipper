import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MODEL = '@cf/black-forest-labs/flux-1-schnell';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const input = await req.json();
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (!prompt || prompt.length > 2048) {
      return Response.json({ error: 'Invalid input: prompt is missing or too long' }, { status: 400 });
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    if (!accountId || !apiToken) {
      return Response.json({ error: 'AI_NOT_CONFIGURED' }, { status: 503 });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt}\nCreate a clean, high-contrast 16:9 YouTube thumbnail composition. Do not add unreadable text or watermarks.`,
          steps: 4,
        }),
      },
    );

    const payload = await response.json();
    if (!response.ok || !payload?.success || !payload?.result?.image) {
      const message = payload?.errors?.[0]?.message || 'Thumbnail generation failed';
      throw new Error(message);
    }

    return Response.json({
      url: `data:image/jpeg;base64,${payload.result.image}`,
      provider: 'cloudflare-workers-ai',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Thumbnail generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
