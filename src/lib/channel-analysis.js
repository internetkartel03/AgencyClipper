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
  const response = await base44.functions.invoke('analyzeAgencyChannel', { channelUrl });
  return response.data.result;
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