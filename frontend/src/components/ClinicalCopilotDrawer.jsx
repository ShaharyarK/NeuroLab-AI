import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

export default function ClinicalCopilotDrawer({ 
  isOpen, 
  onClose, 
  currentCase, 
  settings,
  llmSettings
}) {
  const activeSettings = settings || llmSettings || {
    provider: 'huggingface',
    modelName: 'Qwen/Qwen2.5-72B-Instruct',
    hfToken: '',
    ollamaUrl: 'http://localhost:11434'
  };

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `Hello Dr. Chen. I am your NeuroLab Clinical Copilot. I'm actively reviewing ${currentCase?.name || 'Sarah Johnson'}'s case (ID: ${currentCase?.id || 'NL0194'}). How can I assist with this diagnosis?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          patient_context: currentCase,
          provider: activeSettings.provider || 'auto',
          model_name: activeSettings.modelName,
          hf_token: activeSettings.hfToken,
          ollama_url: activeSettings.ollamaUrl
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { role: 'ai', content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'ai', content: "Unable to process query. Please check your AI model settings." }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: `Network error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Summarize differential diagnoses",
    "Explain elevated CRP, Ferritin & LDH",
    "Recommend surgical vs biopsy pathway",
    "Fleischner guidelines for 14mm nodule"
  ];

  return (
    <div className="copilot-drawer">
      {/* Header */}
      <div className="modal-header" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} color="var(--cyan-neon)" />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
              Clinical AI Copilot
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--cyan-400)' }}>
              {activeSettings.provider === 'huggingface' 
                ? (activeSettings.modelName || 'Qwen 2.5 72B') 
                : (activeSettings.provider ? activeSettings.provider.toUpperCase() : 'LOCAL AI')}
            </div>
          </div>
        </div>
        <button className="tool-icon-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="chat-history">
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            className={`chat-bubble ${m.role === 'user' ? 'chat-user' : 'chat-ai'}`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-ai" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={14} className="spin-animation" />
            <span style={{ fontSize: '0.775rem' }}>Analyzing clinical findings...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px 12px', background: 'rgba(10, 19, 34, 0.8)' }}>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.7rem',
              padding: '3px 8px',
              borderRadius: '9999px',
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              color: 'var(--cyan-400)',
              cursor: 'pointer'
            }}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="chat-input-bar"
      >
        <input 
          type="text"
          placeholder="Ask about patient case, imaging, or lab metrics..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="form-input"
          style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading || !input.trim()}
          style={{ padding: '6px 12px' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
