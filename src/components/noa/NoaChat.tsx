'use client';

import { useState, useEffect, useRef } from 'react';
import { saveNoaSession, loadNoaSession } from '@/lib/noa-storage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENING = '¡Hola! Soy NOA 👋 ¿Cómo se llama tu negocio y qué tipo de productos o servicios vendés?';

export default function NoaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = loadNoaSession();
    if (session && session.messages.length > 0) {
      setMessages(session.messages as Message[]);
      setMinimized(session.minimized);
    } else {
      const opening: Message = { role: 'assistant', content: OPENING };
      setMessages([opening]);
      saveNoaSession({
        messages: [opening],
        minimized: false,
        lastUpdated: new Date().toISOString(),
      });
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMinimize = () => {
    const next = !minimized;
    setMinimized(next);
    if (!next) setHasUnread(false);
    const session = loadNoaSession();
    if (session) saveNoaSession({ ...session, minimized: next, lastUpdated: new Date().toISOString() });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/noa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: {} }),
      });

      if (!response.ok || !response.body) throw new Error('error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: 'assistant', content }]);
      }

      const finalMessages = [...newMessages, { role: 'assistant', content }];
      const session = loadNoaSession();
      saveNoaSession({
        name: session?.name,
        businessType: session?.businessType,
        messages: finalMessages,
        minimized,
        lastUpdated: new Date().toISOString(),
      });

      if (minimized) setHasUnread(true);
    } catch {
      setMessages([...messages, userMsg, { role: 'assistant', content: 'Hubo un error, intentá de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (!mounted) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    left: 0,
    width: '100%',
    zIndex: 40,
  };

  const desktopOverride = `
    @media (min-width: 640px) {
      .noa-container {
        bottom: 24px !important;
        right: 24px !important;
        left: auto !important;
        width: 380px !important;
      }
      .noa-panel {
        height: 520px !important;
        border-radius: 16px !important;
      }
      .noa-minimized-bar {
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
      }
    }
  `;

  if (minimized) {
    return (
      <>
        <style>{desktopOverride}</style>
        <div className="noa-container" style={containerStyle}>
          <div
            className="noa-minimized-bar"
            onClick={toggleMinimize}
            style={{
              background: '#1a1a2e',
              borderRadius: '12px 12px 0 0',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'white', fontWeight: 600, fontSize: 14, flex: 1 }}>NOA · Asistente de Ventas</span>
            {hasUnread && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
            )}
            <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{desktopOverride}</style>
      <div className="noa-container" style={containerStyle}>
        <div
          className="noa-panel"
          style={{
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            height: '420px',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <div style={{ background: '#1a1a2e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 14, flex: 1 }}>NOA · Asistente de Ventas</span>
            <button
              onClick={toggleMinimize}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              aria-label="Minimizar"
            >
              <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8f9fa' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#2563eb' : '#1a1a2e',
                  color: 'white',
                  fontSize: 14,
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#1a1a2e', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  NOA está escribiendo...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, background: 'white', flexShrink: 0 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Escribí tu mensaje..."
              style={{
                flex: 1,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                outline: 'none',
                background: loading ? '#f9fafb' : 'white',
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
