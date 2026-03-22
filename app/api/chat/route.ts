import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import ollama from 'ollama';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const USE_OLLAMA = process.env.NEXT_PUBLIC_USE_OLLAMA === 'true';
const OLLAMA_MODEL = process.env.OLLAMA_CHAT_MODEL || 'qwen2.5';

export async function POST(req: NextRequest) {
  try {
    const { messages, isBrainstormMode } = await req.json();

    const systemPrompt = isBrainstormMode 
      ? `You are in BRAINSTORM MODE. Your goal is to think critically, find holes in the user's ideas, and present your own creative, honest, and sometimes contrarian ideas. 
         Be informal but sharp. If the user mentions a scientific concept, your knowledge should be at the level of a senior undergraduate student. 
         If you identify a key idea or a point to remember, prefix it with "IDEA: " so the system can note it down.`
      : `You are a helpful AI smart assistant. You are the user's "brain". 
         Be concise, honest, and helpful. Your scientific knowledge is at the level of a senior undergraduate student. 
         If asked to search or summarize, you have access to screen reading and file analysis tools (already processed by the frontend).`;

    let content = '';
    let ideas: string[] = [];

    if (USE_OLLAMA) {
      const response = await ollama.chat({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        options: {
          temperature: isBrainstormMode ? 0.9 : 0.7,
        }
      });
      content = response.message.content;
    } else {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: isBrainstormMode ? 0.9 : 0.7,
      });
      content = response.choices[0].message.content || '';
    }
    
    // Extract ideas for the notepad if in brainstorm mode
    if (isBrainstormMode && content) {
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.includes('IDEA:')) {
          ideas.push(line.split('IDEA:')[1].trim());
        }
      });
    }

    return NextResponse.json({ content, ideas });
  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
