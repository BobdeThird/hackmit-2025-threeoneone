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

interface Report {
  street_address: string;
  coordinates: [number, number];
  images?: string;
  timestamp: string;
  description: string;
}

export async function POST(req: Request) {
  try {
    const { report1, report2 }: { report1: Report; report2: Report } = await req.json();

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Report 1: 
Address: ${report1.street_address}
Coordinates: ${report1.coordinates}
Timestamp: ${report1.timestamp}
Description: ${report1.description}`,
            },
            ...(report1.images ? [{
              type: 'image' as const,
              image: report1.images,
            }] : []),
            {
              type: 'text',
              text: `\n\nReport 2:
Address: ${report2.street_address}
Coordinates: ${report2.coordinates}
Timestamp: ${report2.timestamp}
Description: ${report2.description}`,
            },
            ...(report2.images ? [{
              type: 'image' as const,
              image: report2.images,
            }] : []),
          ],
        },
      ],
      schema: z.object({
        "Ranking": z.number().min(1).max(2).describe('Ranking whether report 1 or report 2 is more critical and should be handled first. 1 is report 1, 2 is report 2.'),
        "Reasoning": z.string().describe('Reasoning for the rankin. Also describe the images and description of the reports and how they compare to each other.'),
      }),
      providerOptions: {
        openai: {
          reasoning_effort: 'minimal',
        },
      },
    });

    return result.toJsonResponse();
  } catch (error) {
    console.error('Error in ranking API:', error);
    return Response.json({ error: 'Failed to process ranking request' }, { status: 500 });
  }
}