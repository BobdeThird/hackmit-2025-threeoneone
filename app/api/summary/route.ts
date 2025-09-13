import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const SYSTEM_PROMPT = `
You are an expert city service analyst. Given a report, summarize and grade the report.
Each report will have the following information:

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

Your output should be a summary of the report and a grade from 1-10 for the report.
{
    "summary": string; // A summary of the report based on the description and images provided
    "importance": number; // A grade from 1-10 for the importance of the report (based on description, image, timestamp, street address, and coordinates)
}

It is vital that you also have a bullshit detector and take descriptions and images with a grain of salt. If the description is clearly biased, you should give it a lower score for importance.
`;

export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();

  const result = await generateObject({
    model: openai('gpt-5-nano'),
    system: SYSTEM_PROMPT,
    prompt,
    schema: z.object({
      "Summary": z.string().describe('A summary of the report based on the description and images provided'),
      "Importance": z.number().min(1).max(10).describe('A grade from 1-10 for the importance of the report (based on description, image, timestamp, street address, and coordinates)'),
    }),
  });

  return result.toJsonResponse();
}