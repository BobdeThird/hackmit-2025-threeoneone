import { runPolicyAnalysis } from "@/lib/claude/policy-agent";

export const runtime = 'nodejs';
export const maxDuration = 300;

function sseEvent(event: string, data: unknown) {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request) {
  const { prompt, city } = await req.json();
  
  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const enhancedPrompt = city 
    ? `${prompt} (Focus on city: ${city})`
    : prompt;

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const encoder = new TextEncoder();
      
      // Keep-alive ping
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
      }, 15000);

      try {
        controller.enqueue(sseEvent('started', { message: 'Policy analysis started' }));
        
        const analysisGenerator = await runPolicyAnalysis(enhancedPrompt);
        
        for await (const message of analysisGenerator) {
          if (message.type === 'result') {
            if (message.subtype === 'success') {
              controller.enqueue(sseEvent('message', {
                type: 'assistant',
                content: message.result
              }));
            } else if (message.subtype === 'error') {
              controller.enqueue(sseEvent('error', {
                message: message.error || 'Analysis failed'
              }));
            }
          } else if (message.type === 'tool_use') {
            controller.enqueue(sseEvent('tool', {
              tool: message.name,
              input: message.input,
              thinking: 'Executing database query...'
            }));
          } else if (message.type === 'tool_result') {
            controller.enqueue(sseEvent('tool_result', {
              tool: message.tool_use_id,
              result: message.content?.[0]?.text || 'Tool executed'
            }));
          } else if (message.type === 'text') {
            controller.enqueue(sseEvent('text', {
              content: message.text
            }));
          }
        }
        
        controller.enqueue(sseEvent('done', { message: 'Analysis complete' }));
      } catch (error) {
        console.error('Policy analysis error:', error);
        controller.enqueue(sseEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }));
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
