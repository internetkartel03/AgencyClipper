import { agencyAi, text } from '../../shared/agencyAi.ts';

const schema = {
  type: 'object', required: ['name', 'channelSummary', 'contentStyleAnalysis', 'offers', 'contentStrategy', 'growthOpportunities', 'latestUploads'],
  properties: {
    name: { type: 'string' }, channelThumbnail: { type: 'string' }, channelSummary: { type: 'string' },
    contentStyleAnalysis: { type: 'string' }, offers: { type: 'string' },
    contentStrategy: { type: 'array', items: { type: 'object', required: ['action', 'reasoning'], properties: { action: { type: 'string' }, reasoning: { type: 'string' } } } },
    growthOpportunities: { type: 'array', items: { type: 'string' } },
    latestUploads: { type: 'array', items: { type: 'object', required: ['title', 'url', 'durationSeconds'], properties: { title: { type: 'string' }, url: { type: 'string' }, publishedAt: { type: 'string' }, durationSeconds: { type: 'number' } } } },
  },
};

export default async function(req: Request): Promise<Response> {
  return agencyAi(req, async ({ input, core }) => {
    const url = text(input.channelUrl, 300);
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('Invalid input: enter a YouTube URL'); }
    if (parsed.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname)) throw new Error('Invalid input: enter a YouTube channel URL');
    return await core.InvokeLLM({
      add_context_from_internet: true, response_json_schema: schema,
      prompt: `Analyze the public YouTube channel at ${url} for a content agency. Use the newest uploads you can verify. Return its name, thumbnail URL, summary, content style, offers, specific strategy actions with separate reasoning, growth opportunities, and up to 12 latest uploads with verifiable durations. A video lasting 240 seconds or more is long-form; under 240 seconds is short-form. Do not invent unavailable metrics or durations.`,
    });
  });
}