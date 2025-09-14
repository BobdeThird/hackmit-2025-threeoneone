'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
  type: 'user' | 'assistant' | 'tool' | 'error';
  content: string;
  tool?: string;
  thinking?: string;
  timestamp: Date;
}

interface ClaudePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaudePolicyModal({ open, onOpenChange }: ClaudePolicyModalProps) {
  const [prompt, setPrompt] = useState('');
  const [city, setCity] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startAnalysis = async () => {
    if (!prompt.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setMessages([]);
    setCurrentTool(null);

    // Add user message
    setMessages([{
      type: 'user',
      content: prompt,
      timestamp: new Date()
    }]);

    try {
      const response = await fetch('/api/claude/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, city: city || undefined })
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (line.startsWith('event: message')) {
                setMessages(prev => [...prev, {
                  type: 'assistant',
                  content: data.content,
                  timestamp: new Date()
                }]);
              } else if (line.startsWith('event: tool')) {
                setCurrentTool(data.tool);
                setMessages(prev => [...prev, {
                  type: 'tool',
                  content: `🔧 Executing ${data.tool}...`,
                  tool: data.tool,
                  thinking: data.thinking,
                  timestamp: new Date()
                }]);
              } else if (line.startsWith('event: tool_result')) {
                setCurrentTool(null);
                setMessages(prev => [...prev, {
                  type: 'tool',
                  content: `✅ Tool completed: ${data.result.substring(0, 200)}${data.result.length > 200 ? '...' : ''}`,
                  timestamp: new Date()
                }]);
              } else if (line.startsWith('event: text')) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.type === 'assistant') {
                    lastMessage.content += data.content;
                  } else {
                    newMessages.push({
                      type: 'assistant',
                      content: data.content,
                      timestamp: new Date()
                    });
                  }
                  return newMessages;
                });
              } else if (line.startsWith('event: error')) {
                setMessages(prev => [...prev, {
                  type: 'error',
                  content: `❌ Error: ${data.message}`,
                  timestamp: new Date()
                }]);
              } else if (line.startsWith('event: done')) {
                setIsAnalyzing(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: `❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
      setIsAnalyzing(false);
    }
  };

  const stopAnalysis = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsAnalyzing(false);
    setCurrentTool(null);
  };

  const handleReset = () => {
    stopAnalysis();
    setMessages([]);
    setPrompt('');
    setCity('');
  };

  const predefinedPrompts = [
    "Analyze the most urgent 311 issues requiring immediate policy intervention",
    "Identify patterns in citizen complaints that suggest systemic municipal problems", 
    "Generate a resource allocation strategy based on current 311 data trends",
    "Find correlations between issue types, locations, and resolution times to optimize city operations",
    "Create a quarterly policy brief highlighting key municipal service gaps"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🤖 Claude Policy Analyst
            {isAnalyzing && <span className="text-sm text-blue-600">(Analyzing...)</span>}
            {currentTool && <span className="text-xs text-orange-600">Using {currentTool}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Input Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Textarea
                  placeholder="What policy analysis would you like? E.g., 'Analyze traffic safety issues and recommend interventions'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isAnalyzing}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Select value={city} onValueChange={setCity} disabled={isAnalyzing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All cities</SelectItem>
                    <SelectItem value="SF">San Francisco</SelectItem>
                    <SelectItem value="NYC">New York City</SelectItem>
                    <SelectItem value="BOSTON">Boston</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button 
                    onClick={startAnalysis} 
                    disabled={!prompt.trim() || isAnalyzing}
                    className="flex-1"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </Button>
                  {isAnalyzing && (
                    <Button onClick={stopAnalysis} variant="outline" size="sm">
                      Stop
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2">
              {predefinedPrompts.map((predefined, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(predefined)}
                  disabled={isAnalyzing}
                  className="text-xs"
                >
                  {predefined.substring(0, 50)}...
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 border rounded-lg p-4 overflow-y-auto bg-slate-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-4">🏛️</div>
                <p>Ready to analyze municipal data and generate policy insights.</p>
                <p className="text-sm mt-2">Claude will query your database, analyze trends, and provide actionable recommendations.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-100 ml-8' 
                        : message.type === 'error'
                        ? 'bg-red-100'
                        : message.type === 'tool'
                        ? 'bg-yellow-50 text-sm'
                        : 'bg-white mr-8'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-xs text-gray-500">
                        {message.type === 'user' ? '👤 You' : 
                         message.type === 'error' ? '❌ Error' :
                         message.type === 'tool' ? '🔧 Tool' : '🤖 Claude'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                    {message.thinking && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        {message.thinking}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button onClick={handleReset} variant="outline" disabled={isAnalyzing}>
              Reset
            </Button>
            <div className="text-xs text-gray-500">
              Powered by Claude Code SDK with custom database tools
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
