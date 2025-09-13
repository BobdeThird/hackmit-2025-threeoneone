import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;