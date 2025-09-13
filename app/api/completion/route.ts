import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const SYSTEM_PROMPT = `
You are an expert city service analyst. Analyze city service reports and assign scores from 1-10 for Location, Severity, Freshness, Reasoning, and Suggested Department based on the report details.
`;

export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();

  const result = await generateObject({
    model: openai('gpt-5-nano'),
    system: SYSTEM_PROMPT,
    prompt,
    schema: z.object({
      "Location Score": z.number().min(1).max(10).describe('Score from 1-10 indicating how critical the location is for immediate attention'),
      "Severity": z.number().min(1).max(10).describe('Score from 1-10 indicating the severity/urgency of the reported issue'),
      "Freshness": z.number().min(1).max(10).describe('Score from 1-10 indicating how recent/timely the report is. 10 is the most recent, 1 is the oldest.'),
      "Reasoning": z.string().describe('Reasoning for the scores'),
      "Suggested Department": z.string().describe('Suggested department to handle the report'),
    }),
  });

  return result.toJsonResponse();
}