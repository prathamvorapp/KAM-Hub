'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  generatedQuery?: string;
}

export default function DynamicAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showQuery, setShowQuery] = useState<{ [key: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/chat-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });
      const data = await response.json();
      setConnected(data.connected);
    } catch {
      setConnected(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || data.error || 'No response',
        data: data.queryResult?.data,
        generatedQuery: data.generatedQuery,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to get response. Make sure Ollama is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    await fetch('/api/chat-dynamic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    });
    setMessages([]);
    setShowQuery({});
  };

  const toggleQuery = (index: number) => {
    setShowQuery(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zeta</h1>
          <p className="text-sm text-gray-600">AI generates queries on the fly - ask anything!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected === null
                  ? 'bg-gray-400'
                  : connected
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {connected === null
                ? 'Checking...'
                : connected
                ? 'Ollama Connected'
                : 'Ollama Disconnected'}
            </span>
          </div>
          <button
            onClick={clearChat}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Ask Me Anything!
            </h2>
            <p className="text-gray-600 mb-6">The AI will generate custom queries for any question:</p>
            <div className="space-y-2 text-left max-w-2xl mx-auto">
              <div className="bg-white p-3 rounded-lg border">
                "What is expense by Pratham?"
              </div>
              <div className="bg-white p-3 rounded-lg border">
                "How many brands do we have?"
              </div>
              <div className="bg-white p-3 rounded-lg border">
                "Which brand has the most outlets?"
              </div>
              <div className="bg-white p-3 rounded-lg border">
                "Compare revenue between Mahima Sali and Harsh Gohel"
              </div>
              <div className="bg-white p-3 rounded-lg border">
                "What are the top 5 churn reasons?"
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200 bg-blue-50">
                🎯 "Sales pitch for La Pinoz" — get 5 talking points before a brand visit
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              
              {msg.generatedQuery && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => toggleQuery(idx)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showQuery[idx] ? '▼ Hide Generated Query' : '▶ Show Generated Query'}
                  </button>
                  {showQuery[idx] && (
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {msg.generatedQuery}
                    </pre>
                  )}
                </div>
              )}
              
              {msg.data && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                      View Raw Data
                    </summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(msg.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                <span className="text-sm text-gray-600 ml-2">Generating query...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything about your data..."
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !connected}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !connected || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
