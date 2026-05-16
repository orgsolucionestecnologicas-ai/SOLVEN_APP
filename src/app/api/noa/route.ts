import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { NOA_SYSTEM_PROMPT } from '@/lib/noa-prompt';

export const dynamic = 'force-dynamic';

interface MessageInput {
  role: string;
  content: string;
}

interface RequestBody {
  messages: MessageInput[];
  context?: {
    name?: string;
    businessType?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensajes requeridos' }, { status: 400 });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json({ error: 'Formato de mensaje inválido' }, { status: 400 });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not configured');
      return NextResponse.json({ error: 'Servicio no disponible en este momento' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    let systemPrompt = NOA_SYSTEM_PROMPT;
    if (context?.name || context?.businessType) {
      const parts: string[] = [];
      if (context.name) parts.push(`Nombre del visitante: ${context.name}`);
      if (context.businessType) parts.push(`Tipo de negocio: ${context.businessType}`);
      systemPrompt += `\n\nContexto del visitante: ${parts.join('. ')}.`;
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error. Intentá de nuevo.' },
      { status: 500 }
    );
  }
}
