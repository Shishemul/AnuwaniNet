import React, { useState } from 'react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  testMySQLConnection,
  SUPABASE_SQL_SCHEMA,
  MYSQL_SQL_SCHEMA
} from '../../services/supabaseService';
import { DataService } from '../../services/dataService';
import { Database, CheckCircle, AlertCircle, Copy, Check, ExternalLink, X, Key, Globe, Server, Zap } from 'lucide-react';

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
  const [engine, setEngine] = useState<'supabase' | 'mysql'>(() => config.engine || 'supabase');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMysqlSql, setCopiedMysqlSql] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'supabase' | 'mysql'>('supabase');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    let res: { success: boolean; message: string };
    if (engine === 'supabase') {
      res = await testSupabaseConnection(config.url, config.anonKey);
    } else {
      res = await testMySQLConnection(
        config.mysqlHost || 'localhost',
        config.mysqlPort || 3306,
        config.mysqlDatabase || 'anuwani_isp',
        config.mysqlUser || 'root',
        config.mysqlPassword
      );
    }

    setIsTesting(false);
    setTestResult(res);

    const updatedConfig = {
      ...config,
      engine,
      isConnected: res.success,
      lastTested: new Date().toLocaleString('id-ID')
    };

    saveStoredSupabaseConfig(updatedConfig);
    setConfig(updatedConfig);
    onConfigUpdated();
  };

  const handleSaveAllSettingsToDb = async () => {
    setIsSavingSettings(true);
    setSaveNotice(null);
    try {
      const res = await DataService.saveAllSettingsDirectlyToDatabase();
      setIsSavingSettings(false);
      setSaveNotice(res.message);
      setConfig(getStoredSupabaseConfig());
      onConfigUpdated();
      setTimeout(() => setSaveNotice(null), 5000);
    } catch (e: any) {
      setIsSavingSettings(false);
      setSaveNotice(e?.message || 'Gagal menyimpan pengaturan ke database.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleCopyMysqlSql = () => {
    navigator.clipboard.writeText(MYSQL_SQL_SCHEMA);
    setCopiedMysqlSql(true);
    setTimeout(() => setCopiedMysqlSql(false), 3000);
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
                <span>Integrasi Database (Supabase & MySQL)</span>
                <span className={`w-2 h-2 rounded-full ${config.isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </h2>
              <p className="text-[11px] text-zinc-400">
                Penyimpanan langsung seluruh pengaturan & data aplikasi ke PostgreSQL / MySQL.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setEngine('supabase')}
            className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              engine === 'supabase'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Supabase (PostgreSQL)</span>
          </button>

          <button
            type="button"
            onClick={() => setEngine('mysql')}
            className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              engine === 'mysql'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>MySQL / MariaDB</span>
          </button>
        </div>

        {/* Direct Save Settings Action */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-red-500" />
              <span>Simpan Seluruh Pengaturan ke Database</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {config.lastSettingsSavedAt ? `Saved: ${config.lastSettingsSavedAt}` : 'Real-time sync'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveAllSettingsToDb}
            disabled={isSavingSettings}
            className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-sm shadow-red-950 flex items-center justify-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan Sekarang ke Database'}</span>
          </button>
          {saveNotice && (
            <div className="p-2 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{saveNotice}</span>
            </div>
          )}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleTestAndSave} className="space-y-4 text-xs">
          {engine === 'supabase' ? (
            <>
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
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-zinc-400 mb-1">Host MySQL Server</label>
                  <input
                    type="text"
                    placeholder="localhost / 127.0.0.1 / IP"
                    value={config.mysqlHost || 'localhost'}
                    onChange={e => setConfig({ ...config, mysqlHost: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-amber-600 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Port</label>
                  <input
                    type="number"
                    placeholder="3306"
                    value={config.mysqlPort || 3306}
                    onChange={e => setConfig({ ...config, mysqlPort: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-amber-600 text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Database Name</label>
                  <input
                    type="text"
                    placeholder="anuwani_isp"
                    value={config.mysqlDatabase || 'anuwani_isp'}
                    onChange={e => setConfig({ ...config, mysqlDatabase: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-amber-600 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="root"
                    value={config.mysqlUser || 'root'}
                    onChange={e => setConfig({ ...config, mysqlUser: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-amber-600 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={config.mysqlPassword || ''}
                  onChange={e => setConfig({ ...config, mysqlPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-amber-600 text-[11px]"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-zinc-400">
              {config.isConnected ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Terhubung ({config.lastTested})
                </span>
              ) : (
                <span className="text-zinc-500">
                  Mode: Local persistent mirror (Siap sinkron ke cloud)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              {isTesting ? 'Mengetes...' : `Simpan & Tes Koneksi ${engine === 'supabase' ? 'Supabase' : 'MySQL'}`}
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

        {/* SQL Schema Exporter: Supabase PostgreSQL & MySQL */}
        <div className="pt-3 border-t border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSchemaTab('supabase')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeSchemaTab === 'supabase'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                PostgreSQL (Supabase)
              </button>
              <button
                type="button"
                onClick={() => setActiveSchemaTab('mysql')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeSchemaTab === 'mysql'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                MySQL / MariaDB
              </button>
            </div>

            {activeSchemaTab === 'supabase' ? (
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
                    <span>Salin PostgreSQL SQL</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCopyMysqlSql}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedMysqlSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin MySQL SQL</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 max-h-44 overflow-y-auto font-mono text-[10px] text-zinc-400 whitespace-pre">
            {activeSchemaTab === 'supabase' ? SUPABASE_SQL_SCHEMA : MYSQL_SQL_SCHEMA}
          </div>
        </div>
      </div>
    </div>
  );
};
