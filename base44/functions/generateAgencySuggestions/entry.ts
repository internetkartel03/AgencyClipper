import { agencyAi, text } from '../../shared/agencyAi.ts';

const titleSchema = { type: 'object', required: ['groups'], properties: { groups: { type: 'array', items: { type: 'object', required: ['originalTitle', 'titles'], properties: { originalTitle: { type: 'string' }, titles: { type: 'array', items: { type: 'string' } } } } } } };
const ideaSchema = { type: 'object', required: ['ideas'], properties: { ideas: { type: 'array', items: { type: 'string' } } } };

export default async function(req: Request): Promise<Response> {
  return agencyAi(req, async ({ input, core }) => {
    if (!['titles', 'ideas'].includes(input.type)) throw new Error('Invalid input: unknown suggestion type');
    const name = text(input.name, 150);
    const summary = text(input.summary || '', 2500);
    const offers = text(input.offers || '', 2500);
    const knowledge = text(input.knowledge || '', 6500);
    const uploads = input.type === 'titles' ? input.uploads : [];
    if (input.type === 'titles' && (!Array.isArray(uploads) || !uploads.length || uploads.length > 5 || uploads.some((v: any) => v.format !== 'LONG_FORM' || Number(v.durationSeconds) < 240))) throw new Error('Invalid input: no eligible long-form uploads');
    const task = input.type === 'titles'
      ? `For each of these long-form videos, produce exactly three stronger alternative titles in a groups array. Keep each originalTitle identical to its source. Videos: ${JSON.stringify(uploads).slice(0, 7000)}`
      : 'Produce ten specific, distinct long-form video ideas in an ideas array.';
    const result = await core.InvokeLLM({ response_json_schema: input.type === 'titles' ? titleSchema : ideaSchema,
      prompt: `${task}\nClient: ${name}\nSummary: ${summary}\nOffers: ${offers}\nLearned principles: ${knowledge}` });
    return input.type === 'titles' ? result.groups : result.ideas;
  });
}