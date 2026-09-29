import { agencyAi, text } from '../../shared/agencyAi.ts';

export default async function(req: Request): Promise<Response> {
  return agencyAi(req, async ({ input, core }) => {
    const principles = text(input.principles, 12000);
    if (!principles) throw new Error('Invalid input: no principles to summarize');
    return await core.InvokeLLM({ prompt: `Group and summarize these learned principles by useful topic. Do not invent anything.\n\n${principles}` });
  });
}