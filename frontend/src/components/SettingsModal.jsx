import React, { useState } from 'react';
import { X, Settings, Cpu, Key, Globe, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [provider, setProvider] = useState(settings.provider || 'huggingface');
  const [hfToken, setHfToken] = useState(settings.hfToken || '');
  const [modelName, setModelName] = useState(settings.modelName || 'Qwen/Qwen2.5-7B-Instruct');
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          hf_token: hfToken,
          model_name: modelName,
          ollama_url: ollamaUrl
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ connected: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      provider,
      hfToken,
      modelName,
      ollamaUrl
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--cyan-neon)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>
              AI Model & Inference Engine Settings
            </h3>
          </div>
          <button className="tool-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Provider selection */}
          <div className="form-group">
            <label className="form-label">Active AI Inference Provider</label>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
              className="form-select"
            >
              <option value="huggingface">Hugging Face Serverless Inference API (Free & Cloud Tested)</option>
              <option value="ollama">Local Ollama / llama.cpp (100% Offline & Private)</option>
              <option value="fallback">NeuroLab Built-in Clinical Rule Engine (Zero-setup Fallback)</option>
            </select>
          </div>

          {/* Hugging Face Options */}
          {provider === 'huggingface' && (
            <>
              <div className="form-group">
                <label className="form-label">
                  Hugging Face User Access Token (Free)
                </label>
                <input 
                  type="password"
                  placeholder="hf_..."
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  className="form-input"
                />
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Get a free read token at{' '}
                  <a 
                    href="https://huggingface.co/settings/tokens" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: 'var(--cyan-neon)' }}
                  >
                    huggingface.co/settings/tokens
                  </a>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hugging Face Model Selection</label>
                <select 
                  value={modelName} 
                  onChange={(e) => setModelName(e.target.value)}
                  className="form-select"
                >
                  <option value="Qwen/Qwen2.5-72B-Instruct">Qwen/Qwen2.5-72B-Instruct (Flagship 72B Medical LLM - Active)</option>
                  <option value="Qwen/Qwen2.5-Coder-32B-Instruct">Qwen/Qwen2.5-Coder-32B-Instruct (32B High-Precision - Active)</option>
                  <option value="meta-llama/Llama-3.1-8B-Instruct">meta-llama/Llama-3.1-8B-Instruct (Meta Open Model)</option>
                  <option value="BioMistral/BioMistral-7B">BioMistral/BioMistral-7B (Specialized Biomedical LLM)</option>
                </select>
              </div>
            </>
          )}

          {/* Ollama Options */}
          {provider === 'ollama' && (
            <>
              <div className="form-group">
                <label className="form-label">Ollama Host URL</label>
                <input 
                  type="text"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Local Model Name</label>
                <input 
                  type="text"
                  placeholder="e.g. meditron, biomistral, or llama3.2"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          )}

          {/* Fallback info */}
          {provider === 'fallback' && (
            <div style={{ padding: '12px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              The Built-in Clinical Rule Engine uses deterministic medical algorithms to synthesize imaging findings and blood test anomalies into accurate, physician-grade reports without needing external internet or tokens.
            </div>
          )}

          {/* Connection Test Result */}
          {testResult && (
            <div style={{ 
              marginTop: '14px', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: testResult.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${testResult.connected ? 'var(--green-normal)' : 'var(--status-reviewing-bg)'}`,
              color: testResult.connected ? 'var(--green-normal)' : 'var(--coral-high)'
            }}>
              {testResult.connected ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message || testResult.error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? <Loader2 size={14} className="spin-animation" /> : <Globe size={14} />}
            <span>Test Connection</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
