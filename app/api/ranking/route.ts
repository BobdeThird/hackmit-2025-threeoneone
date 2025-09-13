import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const SYSTEM_PROMPT = `
You are an expert city service analyst. Compare these two reports and determine which one is more critical and should be handled first. 
For each report, you will be given the following information:

interface Issue {
  street_address: string;
  coordinates: [number, number]; // [lat, lon]
  images?: string;                // optional
  timestamp: string;
  description: string;
}

Street Address and coordinates: may be used to determine severity based on location.
Description: The main description of the issue at hand.
Images: Contains supplemental information about the issue to the description. Also provides unbiased evidence to the description, which is important for determining severity.
Timestamp: The time the report was created. Reports with very recent timestamps are more critical than reports with older timestamps.

It is vital that you also have a bullshit detector and take descriptions and images with a grain of salt. If the description is clearly biased, you should give it a lower score.
`;

export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();

  const result = await generateObject({
    model: openai('gpt-5-nano'),
    system: SYSTEM_PROMPT,
    prompt,
    schema: z.object({
      "Ranking": z.number().min(1).max(2).describe('Ranking whether report 1 or report 2 is more critical and should be handled first. 1 is report 1, 2 is report 2.'),
      "Reasoning": z.string().describe('Reasoning for the ranking'),
    }),
    providerOptions: {
      openai: {
        reasoning_effort: 'minimal', // Increases autonomous exploration
      },
    },
  });

  return result.toJsonResponse();
}