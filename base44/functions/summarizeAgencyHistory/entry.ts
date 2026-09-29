import { agencyAi, text } from '../../shared/agencyAi.ts';

export default async function(req: Request): Promise<Response> {
  return agencyAi(req, async ({ input, core }) => {
    const history = text(input.history, 35000);
    if (!history) throw new Error('Invalid input: no history');
    return await core.InvokeLLM({ prompt: `Summarize this earlier conversation. Preserve decisions, preferences, rejected ideas, facts and unresolved questions; invent nothing.\n\n${history}` });
  });
}