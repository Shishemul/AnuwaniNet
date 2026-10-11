import React, { useState } from 'react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA
} from '../../services/supabaseService';
import { Database, CheckCircle, AlertCircle, Copy, Check, ExternalLink, X, Key, Globe } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [config, setConfig] = useState(() => getStoredSupabaseConfig());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(config.url, config.anonKey);
    setIsTesting(false);
    setTestResult(res);

    const updatedConfig = {
      ...config,
      isConnected: res.success,
      lastTested: new Date().toLocaleString('id-ID')
    };

    saveStoredSupabaseConfig(updatedConfig);
    setConfig(updatedConfig);
    onConfigUpdated();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/60 text-red-500 border border-red-900/40">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Integrasi Database Supabase</span>
                <span className={`w-2 h-2 rounded-full ${config.isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </h2>
              <p className="text-[11px] text-zinc-400">
                Pengelolaan database cloud PostgreSQL & autentikasi aman pengguna AnuwaniNet.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleTestAndSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              <span>Supabase Project URL</span>
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={config.url}
              onChange={e => setConfig({ ...config, url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              Ditemukan di Supabase Dashboard: Project Settings &gt; API &gt; Project URL
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-zinc-500" />
              <span>Supabase Anon Public API Key</span>
            </label>
            <input
              type="text"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={config.anonKey}
              onChange={e => setConfig({ ...config, anonKey: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600 text-[11px]"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              Project Settings &gt; API &gt; Project API keys &gt; anon public
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-zinc-400">
              {config.isConnected ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Terhubung ({config.lastTested})
                </span>
              ) : (
                <span className="text-zinc-500">
                  Mode aktif: Local persistent store (Siap sinkron kapan saja)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors shadow-sm shadow-red-950"
            >
              {isTesting ? 'Mengetes...' : 'Simpan & Tes Koneksi'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>

        {/* PostgreSQL Schema Exporter */}
        <div className="pt-3 border-t border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Skrip SQL Schema Supabase (Auto-Generate)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Salin skrip DDL berikut ke tab <strong>SQL Editor</strong> pada Supabase Dashboard Anda.
              </p>
            </div>
            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 max-h-44 overflow-y-auto font-mono text-[10px] text-zinc-400 whitespace-pre">
            {SUPABASE_SQL_SCHEMA}
          </div>
        </div>
      </div>
    </div>
  );
};
