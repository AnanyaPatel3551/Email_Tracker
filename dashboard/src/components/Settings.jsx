import React, { useState, useEffect } from 'react';

export default function Settings({ session }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  };

  // Fetch user's existing API keys
  const fetchApiKeys = () => {
    setLoading(true);
    fetch(`${apiUrl}/api-keys`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch API keys');
        return res.json();
      })
      .then((data) => {
        setKeys(data);
        setError(null);
      })
      .catch((err) => {
        console.error('[Settings Error]', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchApiKeys();
    }
  }, [session]);

  // Handle generating a new API key
  const handleGenerateKey = () => {
    setGenerating(true);
    setError(null);
    setNewlyCreatedKey(null);

    fetch(`${apiUrl}/api-keys`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Gmail Extension' }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to generate API key');
        return res.json();
      })
      .then((data) => {
        setNewlyCreatedKey(data.api_key.key);
        fetchApiKeys();
      })
      .catch((err) => {
        console.error('[Generate Key Error]', err);
        setError(err.message);
      })
      .finally(() => setGenerating(false));
  };

  // Handle revoking/deleting an API key
  const handleRevokeKey = (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key? External tools using it will lose access.')) {
      return;
    }

    fetch(`${apiUrl}/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to revoke API key');
        return res.json();
      })
      .then(() => {
        fetchApiKeys();
      })
      .catch((err) => {
        console.error('[Revoke Key Error]', err);
        setError(err.message);
      });
  };

  // Copy key helper
  const handleCopyKey = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Settings Title Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          API Key Settings
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Generate and manage API keys to authenticate external integrations like the Chrome Extension.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl flex items-center gap-3 text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Newly Generated Key Banner */}
      {newlyCreatedKey && (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>New API Key Generated Successfully!</span>
          </div>
          <p className="text-xs text-slate-300">
            Please copy your API key now. For your security, it will not be displayed in full again.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <code className="px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-emerald-300 font-mono text-sm flex-1 overflow-x-auto select-all">
              {newlyCreatedKey}
            </code>
            <button
              onClick={() => handleCopyKey(newlyCreatedKey)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 flex-shrink-0"
            >
              {copied ? 'Copied!' : 'Copy Key'}
            </button>
          </div>
        </div>
      )}

      {/* Chrome Extension Guide Box */}
      <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Why API Keys are Required for the Chrome Extension
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Chrome Extension runs inside Gmail (<code className="text-indigo-300 font-mono">mail.google.com</code>) and cannot access your web dashboard's login cookies or LocalStorage due to browser Same-Origin Policy (SOP). Generate an API key above and pass it in the <code className="text-indigo-300 font-mono">X-API-Key</code> header to log emails under your account.
        </p>
      </div>

      {/* Keys Table Container */}
      <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Active API Keys</h3>
            <p className="text-xs text-slate-400 mt-0.5">Keys linked to your Supabase User account</p>
          </div>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? 'Generating...' : '+ Generate New API Key'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Label</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Key Token</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Created At</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-xs text-slate-400">
                    Loading API keys...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400 text-xs">
                    No active API keys found. Click "+ Generate New API Key" above to create one.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-900/20 transition-colors duration-150 border-b border-slate-900">
                    <td className="py-4 px-6 text-sm font-semibold text-slate-200">
                      {k.name || 'Gmail Extension'}
                    </td>
                    <td className="py-4 px-6 text-sm font-mono text-slate-300">
                      {k.key.substring(0, 12)}••••••••••••••••
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400 font-mono">
                      {new Date(k.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-6 text-sm text-right">
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-all duration-150"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
