import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const SYSTEM_PROMPT = `
You are an expert city service analyst. Given a report, summarize and grade the report.
Each report will have the following information:

interface Report {
  street_address: string;
  images?: string[];              // optional array of image URLs
  reported_time: string;
  description: string;
  department: string
}

Street Address and coordinates: may be used to determine severity based on location.
Description: The main description of the issue at hand.
Images: Contains supplemental information about the issue to the description. Also provides unbiased evidence to the description, which is important for determining severity.
Timestamp: The time the report was created. Reports with very recent timestamps are more critical than reports with older timestamps.


Your output should be a summary of the report and a grade from 1-10 for the report.
{
    "Department": string; // The department that is responsible for the report
    "Estimated Time to Resolve": number; // The estimated time to resolve the report (float in hours)
    "Summary": string; // A summary of the report based on the description and images provided
}

It is vital that you also have a bullshit detector and take descriptions and images with a grain of salt. If the description is clearly biased, you should give it a lower score for importance.
`;

interface Report {
  street_address: string;
  coordinates: [number, number];
  images?: string[];              // optional array of image URLs
  reported_time: string;
  description: string;
  native_id?: string;
  status?: string;
  source_scraper: string;
}
export async function POST(req: Request) {
  try {
    const { report }: { report: Report } = await req.json();

    console.log(report.images);
    const result = await generateObject({
      model: openai('gpt-5-mini'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Report:
                    Address: ${report.street_address}
                    Timestamp: ${report.reported_time}
                    Description: ${report.description}`,
            },
            ...(report.images && report.images.length > 0 ? 
              report.images.map(imageUrl => ({
                type: 'image' as const,
                image: imageUrl,
              })) : []),
          ],
        },
      ],
      schema: z.object({
        "Department": z.string().describe('The department that is responsible for the report'),
        "Estimated Time to Resolve": z.number().describe('The estimated time to just finish the task (not including travel or dispatch time) (decimal in hours)'),
        "Summary": z.string().describe('A summary of the report based on the description and images provided'),
      }),
    });

    // combine the result with the report to return a new object
    const combined = {
      ...report,
      ...result.object,
    };

    return Response.json(combined);
  } catch (error) {
    console.error('Error in summary API:', error);
    return Response.json({ error: 'Failed to process summary request' }, { status: 500 });
  }
}