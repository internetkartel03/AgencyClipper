import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export async function agencyAi(req: Request, build: (input: any) => Promise<unknown>): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const input = await req.json();
    // Only feature-defined prompts are sent; the caller cannot select a Core operation.
    const result = await build({ input, core: base44.asServiceRole.integrations.Core });
    return Response.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed';
    const invalid = message.startsWith('Invalid input:');
    return Response.json({ error: message }, { status: invalid ? 400 : 500 });
  }
}

export function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid input: text is missing or too long');
  return value.trim();
}