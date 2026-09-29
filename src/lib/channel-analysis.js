import { base44 } from '@/api/base44Client';
import { classifyVideo } from '@/lib/video-rules';

export const ANALYSIS_SCHEMA = {
  type: 'object',
  required: ['name', 'channelSummary', 'contentStyleAnalysis', 'offers', 'contentStrategy', 'growthOpportunities', 'latestUploads'],
  properties: {
    name: { type: 'string' },
    channelThumbnail: { type: 'string' },
    channelSummary: { type: 'string' },
    contentStyleAnalysis: { type: 'string' },
    offers: { type: 'string' },
    contentStrategy: {
      type: 'array', items: {
        type: 'object', required: ['action', 'reasoning'],
        properties: { action: { type: 'string' }, reasoning: { type: 'string' } },
      },
    },
    growthOpportunities: { type: 'array', items: { type: 'string' } },
    latestUploads: {
      type: 'array', items: {
        type: 'object', required: ['title', 'url', 'durationSeconds', 'format'],
        properties: {
          title: { type: 'string' }, url: { type: 'string' }, publishedAt: { type: 'string' },
          durationSeconds: { type: 'number' }, format: { type: 'string', enum: ['LONG_FORM', 'SHORT_FORM'] },
        },
      },
    },
  },
};

export async function analyzeChannel(channelUrl) {
  return base44.integrations.Core.InvokeLLM({
    add_context_from_internet: true,
    response_json_schema: ANALYSIS_SCHEMA,
    prompt: `Analyze the YouTube channel at ${channelUrl} for a professional content agency. Use the newest, most recent uploads available now, not an old cached set. Return the public channel name and thumbnail URL, a concise channel summary, content style analysis, products/services/offers being sold, specific content strategy recommendations, growth opportunities, and up to 12 latest uploads with exact durations when discoverable.

CRITICAL CLASSIFICATION RULE: classify every video by duration only. A video lasting 4:00 (240 seconds) or longer is LONG_FORM. Anything under 4:00 is SHORT_FORM. Do not use YouTube's Shorts tab, URL type, aspect ratio, or label as the definition. Collect both formats. Every strategy action must be one short sentence stating what to change and what to change it to; put supporting detail only in its reasoning field. Do not invent unavailable metrics.`,
  });
}

export function analysisToClient(analysis) {
  return {
    name: analysis.name,
    channelThumbnail: analysis.channelThumbnail || '',
    channelSummary: analysis.channelSummary || '',
    contentStyleAnalysis: analysis.contentStyleAnalysis || '',
    offers: analysis.offers || '',
    contentStrategy: JSON.stringify(analysis.contentStrategy || []),
    growthOpportunities: JSON.stringify(analysis.growthOpportunities || []),
    latestUploads: JSON.stringify((analysis.latestUploads || []).map(video => ({
      ...video,
      format: classifyVideo(video.durationSeconds),
    }))),
    analysisUpdatedAt: new Date().toISOString(),
  };
}

export function isApiConfigurationError(error) {
  const message = `${error?.message || ''} ${error?.data?.message || ''}`.toLowerCase();
  return error?.status === 401 || error?.status === 403 || message.includes('api key') || message.includes('not configured') || message.includes('integration');
}
