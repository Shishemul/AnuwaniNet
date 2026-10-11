import React, { useState } from 'react';
import {
  BookOpen,
  Rocket,
  Server,
  Database,
  Smartphone,
  CreditCard,
  Globe,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Printer,
  Receipt
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../services/supabaseService';

export const HostingTutorialSection: React.FC = () => {
  const [selectedHosting, setSelectedHosting] = useState<'vercel' | 'vps' | 'cpanel' | 'netlify'>('vercel');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(1);

  // Interactive Checklist State saved in localStorage
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('anw_hosting_checklist_v1');
      return saved ? JSON.parse(saved) : {
        step1_build: true,
        step2_supabase: false,
        step3_whatsapp: false,
        step4_ruijie: false,
        step5_dana: false,
        step6_deploy: false,
        step7_ssl: false,
        step8_admin_pwd: false
      };
    } catch {
      return {};
    }
  });

  const toggleChecklist = (key: string) => {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    try {
      localStorage.setItem('anw_hosting_checklist_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleAccordion = (stepNum: number) => {
    setOpenStep(openStep === stepNum ? null : stepNum);
  };

  // Sample Configs
  const envExampleContent = `# ==============================================================
# ANUWANINET ENVIRONMENT CONFIGURATION (.env)
# ==============================================================
# Supabase Cloud Database (Dapatkan di supabase.com -> Project Settings -> API)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here

# Mode Aplikasi
VITE_APP_ENV=production
`;

  const vercelJsonContent = `{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}`;

  const htaccessContent = `# ==============================================================
# ANUWANINET APACHE / CPANEL URL REWRITE (.htaccess)
# Tempatkan file ini di dalam public_html atau folder root website
# ==============================================================
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Cache Control & Gzip Compression
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/gif "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType text/css "access plus 1 week"
  ExpiresByType application/javascript "access plus 1 week"
</IfModule>`;

  const nginxConfigContent = `# ==============================================================
# NGINX REVERSE PROXY & SPA CONFIGURATION (/etc/nginx/sites-available/anuwaninet)
# ==============================================================
server {
    listen 80;
    server_name billing.anuwani.net; # Ganti dengan domain Anda

    root /var/www/anuwaninet/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Caching
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public";
    }
}`;

  const completedStepsCount = Object.values(checklist).filter(Boolean).length;
  const totalChecklistItems = 8;
  const progressPercent = Math.round((completedStepsCount / totalChecklistItems) * 100);

  return (
    <div className="space-y-6 text-xs">
      {/* Hero Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/40 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Panduan Lengkap Langkah-demi-Langkah Hosting & Produksi
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/80 uppercase">
                  Master Guide
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                Panduan komprehensif mulai dari persiapan database cloud, integrasi API Ruijie & WhatsApp, hingga deployment live ke Vercel, VPS Linux, atau cPanel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* Progress Tracker Ribbon */}
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Progress Kesiapan Deployment Anda: {completedStepsCount} dari {totalChecklistItems} Langkah Selesai
            </span>
            <span className="font-mono font-bold text-amber-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Accordion Steps 1 to 7 */}
      <div className="space-y-3">
        {/* STEP 1: Prasyarat & Struktur Project */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(1)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-950 text-amber-400 font-bold flex items-center justify-center font-mono text-[11px] border border-amber-800/80">
                1
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Prasyarat Sistem & Persiapan File Project
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Node.js 18+, TypeScript, Vite Build, dan struktur artefak dist
                </p>
              </div>
            </div>
            {openStep === 1 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 1 && (
            <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950/40">
              <p className="text-zinc-300 leading-relaxed">
                Aplikasi <strong>AnuwaniNet</strong> dibangun sebagai Single Page Application (SPA) berbasis <strong>React 19</strong>, <strong>Vite</strong>, dan <strong>Tailwind CSS</strong>. Untuk menjalankan dan melakukan build di komputer lokal atau server CI/CD, pastikan telah terinstall:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                <li><strong>Node.js versi 18.0+ atau 20+ LTS</strong> (Cek dengan <code>node -v</code>)</li>
                <li><strong>NPM versi 9+</strong> atau <strong>PNPM / Yarn</strong></li>
                <li>Koneksi internet untuk mengunduh package dependensi</li>
              </ul>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-zinc-300 font-semibold">Perintah Build Lokal / Server:</span>
                  <button
                    onClick={() => handleCopy('npm install\nnpm run build', 'cmd_build')}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    {copiedKey === 'cmd_build' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'cmd_build' ? 'Tersalin' : 'Salin Perintah'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded bg-zinc-950 font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`# 1. Install semua dependencies
npm install

# 2. Compile & build ke folder dist/ untuk hosting statis
npm run build`}
                </pre>
                <p className="text-[11px] text-zinc-500">
                  Setelah perintah di atas sukses, folder <code>dist/</code> akan berisi file HTML, JS bundle teroptimasi, dan CSS yang siap diunggah ke penyedia hosting mana pun.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_step1"
                  checked={checklist.step1_build || false}
                  onChange={() => toggleChecklist('step1_build')}
                  className="w-4 h-4 rounded text-amber-600 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="chk_step1" className="text-zinc-300 cursor-pointer">
                  Saya sudah memverifikasi versi Node.js dan berhasil menjalankan build project.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Database Supabase Cloud */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(2)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center font-mono text-[11px] border border-emerald-800/80">
                2
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Menyiapkan Database Cloud Supabase (Gratis & Real-Time)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  PostgreSQL di cloud, schema tabel otomatis, sinkronisasi antar perangkat tanpa server backend sendiri
                </p>
              </div>
            </div>
            {openStep === 2 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 2 && (
            <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950/40">
              <p className="text-zinc-300 leading-relaxed">
                Aplikasi ini mendukung mode <strong>Hybrid Storage</strong>: data tersimpan cepat di browser lokal dan otomatis tersinkronisasi ke <strong>Supabase Cloud</strong> agar seluruh staf admin/kasir dapat mengakses data yang sama dari perangkat berbeda.
              </p>

              <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                <li>
                  Buka dan daftar akun gratis di{' '}
                  <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold inline-flex items-center gap-1">
                    Supabase.com <ExternalLink className="w-3 h-3 inline" />
                  </a>.
                </li>
                <li>Klik tombol <strong>"New Project"</strong>, beri nama misalnya <code>anuwaninet-db</code> dan pilih region terdekat (contoh: <code>Southeast Asia / Singapore</code>).</li>
                <li>Setelah database aktif (~1 menit), buka menu <strong>SQL Editor</strong> di dashboard Supabase.</li>
                <li>Klik <strong>"New Query"</strong>, salin script SQL Schema di bawah ini, lalu klik <strong>Run</strong>:</li>
              </ol>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-zinc-300 font-semibold">SQL Schema Tabel AnuwaniNet:</span>
                  <button
                    onClick={() => handleCopy(SUPABASE_SQL_SCHEMA, 'sql_schema')}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    {copiedKey === 'sql_schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'sql_schema' ? 'Tersalin!' : 'Salin Seluruh SQL Schema'}</span>
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto p-2.5 rounded bg-zinc-950 font-mono text-[10px] text-zinc-300">
                  {SUPABASE_SQL_SCHEMA.slice(0, 500)}... (6 tabel: pelanggan, tagihan, transaksi, voucher, devices, settings)
                </div>
              </div>

              <div className="space-y-1 text-zinc-300">
                <p>
                  5. Buka menu <strong>Project Settings → API</strong> di Supabase, lalu salin:
                </p>
                <ul className="list-disc list-inside text-zinc-400 pl-2 space-y-0.5">
                  <li><strong>Project URL</strong> (contoh: <code>https://xyzcompany.supabase.co</code>)</li>
                  <li><strong>anon / public key</strong> (kunci akses publik client-side)</li>
                </ul>
                <p>
                  6. Masukkan kedua nilai tersebut ke tab <strong>Aplikasi & Supabase</strong> pada menu Pengaturan Superadmin ini, lalu klik <strong>"Simpan & Uji Koneksi"</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_step2"
                  checked={checklist.step2_supabase || false}
                  onChange={() => toggleChecklist('step2_supabase')}
                  className="w-4 h-4 rounded text-emerald-600 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="chk_step2" className="text-zinc-300 cursor-pointer">
                  Tabel Supabase sudah dibuat dan uji koneksi berstatus sukses.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: Gateway WhatsApp Bot via Fonnte */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(3)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center font-mono text-[11px] border border-emerald-800/80">
                3
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Menyiapkan WhatsApp Gateway & Bot Notifikasi Otomatis (Fonnte)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Kirim tagihan otomatis, bukti kuitansi bayar, peringatan isolir, dan bot balasan 24 jam
                </p>
              </div>
            </div>
            {openStep === 3 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 3 && (
            <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950/40">
              <p className="text-zinc-300 leading-relaxed">
                Pengiriman pesan WhatsApp tanpa perlu biaya bulanan per-pesan Meta API resmi dapat menggunakan gateway WhatsApp lokal <strong>Fonnte</strong> yang sangat stabil di Indonesia.
              </p>

              <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                <li>
                  Daftar akun di{' '}
                  <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold inline-flex items-center gap-1">
                    Fonnte.com <ExternalLink className="w-3 h-3 inline" />
                  </a>.
                </li>
                <li>Masuk ke menu <strong>Device</strong> di Fonnte, lalu scan QR Code menggunakan aplikasi WhatsApp di ponsel server/admin kantor Anda.</li>
                <li>Salin <strong>API Token Device</strong> yang tertera di akun Fonnte.</li>
                <li>Buka tab <strong>WhatsApp Bot</strong> di Pengaturan Superadmin ini, tempelkan API Token Fonnte, dan klik tombol <strong>"Simpan & Uji Handshake"</strong>.</li>
                <li>Lakukan uji kirim pesan percobaan dengan mengisi nomor HP admin untuk memastikan WhatsApp terhubung.</li>
              </ol>

              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Fitur Otomatis yang Siap Aktif:
                </span>
                <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                  Setelah terhubung, bot akan otomatis mengirim rincian tagihan saat generate bulanan, mengirim kuitansi setelah pelunasan, memberikan peringatan H-2 isolir, dan melayani perintah chat interaktif pelanggan (<code>TAGIHAN</code>, <code>BELI 5K</code>, <code>STATUS</code>).
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_step3"
                  checked={checklist.step3_whatsapp || false}
                  onChange={() => toggleChecklist('step3_whatsapp')}
                  className="w-4 h-4 rounded text-emerald-600 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="chk_step3" className="text-zinc-300 cursor-pointer">
                  WhatsApp Device Fonnte sudah terhubung dan pengujian pesan sukses diterima.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* STEP 4: Ruijie Reyee Cloud & Auto-Isolir */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(4)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-red-950 text-red-400 font-bold flex items-center justify-center font-mono text-[11px] border border-red-800/80">
                4
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Menghubungkan Ruijie Reyee Cloud API & Auto-Isolir Jaringan
                </h3>
                <p className="text-[11px] text-zinc-400">
                  App ID, Secret Key, Site ID, monitoring online status perangkat dan eksekusi isolir pelanggan menunggak
                </p>
              </div>
            </div>
            {openStep === 4 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 4 && (
            <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950/40">
              <p className="text-zinc-300 leading-relaxed">
                Integrasi Ruijie Reyee memungkinkan isolir dan buka-isolir pelanggan secara otomatis langsung dari cloud tanpa perlu VPN atau port forwarding Mikrotik yang rumit.
              </p>

              <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                <li>
                  Masuk ke portal{' '}
                  <a href="https://cloud.ruijienetworks.com" target="_blank" rel="noreferrer" className="text-red-400 underline font-semibold inline-flex items-center gap-1">
                    Ruijie Reyee Cloud <ExternalLink className="w-3 h-3 inline" />
                  </a>.
                </li>
                <li>Buka menu <strong>System Management → Open API / API Service</strong>.</li>
                <li>Buat kredensial aplikasi baru untuk mendapatkan <strong>App ID</strong> dan <strong>Secret Key</strong>.</li>
                <li>Buka project jaringan Anda dan catat <strong>Site ID</strong> (contoh: <code>ANW-SITE-01</code>).</li>
                <li>
                  Pada gateway router Ruijie Reyee Anda (misal seri RG-EG105G / EG210G-P), buat satu User Group atau Policy bernama <code>PROFILE_ISOLIR</code> dengan akses bandwidth terbatas atau redirect ke landing page isolir.
                </li>
                <li>Masukkan App ID, Secret Key, dan Site ID ke tab <strong>Ruijie & Isolir</strong> di pengaturan superadmin.</li>
              </ol>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_step4"
                  checked={checklist.step4_ruijie || false}
                  onChange={() => toggleChecklist('step4_ruijie')}
                  className="w-4 h-4 rounded text-red-600 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="chk_step4" className="text-zinc-300 cursor-pointer">
                  Kredensial Ruijie Cloud telah terkonfigurasi dan profil isolir siap bekerja.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* STEP 5: DANA Gateway E-Wallet & QRIS */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(5)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 font-bold flex items-center justify-center font-mono text-[11px] border border-sky-800/80">
                5
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Konfigurasi Pembayaran Instan DANA E-Wallet & QRIS
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Pembayaran otomatis langsung lunas dan isolir terbuka seketika tanpa cek mutasi manual
                </p>
              </div>
            </div>
            {openStep === 5 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 5 && (
            <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950/40">
              <p className="text-zinc-300 leading-relaxed">
                Saat pelanggan membayar lewat link DANA atau QRIS dinamis, webhook DANA memicu pelunasan otomatis, menerbitkan bukti kuitansi di WhatsApp, dan membuka isolir Ruijie secara otomatis.
              </p>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5 text-zinc-300">
                <span className="font-semibold text-white">Dua Cara Penggunaan DANA:</span>
                <p>
                  <strong>1. Mode DANA Merchant Terverifikasi</strong>: Masukkan <em>Merchant ID</em>, <em>Client ID</em>, dan <em>Client Secret</em> resmi dari portal DANA Bisnis.
                </p>
                <p>
                  <strong>2. Mode Direct Link / QRIS Instan</strong>: Sistem secara otomatis membuat deep link <code>https://link.dana.id/pay?order=...</code> dan QRIS statis sehingga tetap dapat digunakan oleh pelanggan tanpa harus menunggu persetujuan merchant formal.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_step5"
                  checked={checklist.step5_dana || false}
                  onChange={() => toggleChecklist('step5_dana')}
                  className="w-4 h-4 rounded text-sky-600 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="chk_step5" className="text-zinc-300 cursor-pointer">
                  Pembayaran DANA & QRIS siap diuji coba oleh pelanggan.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* STEP 6: Panduan Deployment Hosting Lengkap (Vercel, VPS, cPanel, Netlify) */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(6)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-950 text-blue-400 font-bold flex items-center justify-center font-mono text-[11px] border border-blue-800/80">
                6
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Pilihan & Cara Deploy ke Hosting Pilihan Anda (Vercel, VPS, cPanel, Netlify)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Panduan step-by-step spesifik untuk masing-masing tipe web server dan hosting provider
                </p>
              </div>
            </div>
            {openStep === 6 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 6 && (
            <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/40">
              {/* Hosting Provider Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHosting('vercel')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all text-center ${
                    selectedHosting === 'vercel'
                      ? 'bg-zinc-100 text-zinc-950 border-white shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  ▲ Vercel (Rekomendasi)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHosting('vps')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all text-center ${
                    selectedHosting === 'vps'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  🐧 VPS Linux (Nginx)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHosting('cpanel')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all text-center ${
                    selectedHosting === 'cpanel'
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  🌐 cPanel / Shared Hosting
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHosting('netlify')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all text-center ${
                    selectedHosting === 'netlify'
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  💎 Netlify Cloud
                </button>
              </div>

              {/* OPSI 1: VERCEL */}
              {selectedHosting === 'vercel' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>Cara Deploy ke Vercel (Gratis, HTTPS Otomatis, Auto-Deploy Git)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900">
                      Paling Mudah
                    </span>
                  </div>

                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                    <li>Upload atau push source code project ini ke repository <strong>GitHub</strong> atau <strong>GitLab</strong>.</li>
                    <li>
                      Buka{' '}
                      <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold inline-flex items-center gap-1">
                        Vercel.com <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      dan login dengan akun GitHub Anda.
                    </li>
                    <li>Klik <strong>"Add New..." → "Project"</strong>, lalu pilih repository project ini.</li>
                    <li>
                      Pada bagian <strong>Build and Output Settings</strong>:
                      <ul className="list-disc list-inside text-zinc-400 pl-4 py-1">
                        <li>Framework Preset: <code>Vite</code></li>
                        <li>Build Command: <code>npm run build</code></li>
                        <li>Output Directory: <code>dist</code></li>
                      </ul>
                    </li>
                    <li>
                      Buka tab <strong>Environment Variables</strong> dan tambahkan variabel dari Supabase:
                      <pre className="p-2 mt-1 rounded bg-zinc-950 text-emerald-400 text-[10px] font-mono">
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGci...
                      </pre>
                    </li>
                    <li>Klik tombol <strong>"Deploy"</strong>. Dalam 30-45 detik, aplikasi Anda sudah online di <code>https://nama-project.vercel.app</code>!</li>
                    <li>(Opsional) Sambungkan custom domain kantor Anda seperti <code>billing.kantornet.id</code> melalui menu <em>Settings → Domains</em> di Vercel.</li>
                  </ol>

                  {/* Vercel rewrite file */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-300 text-[11px] font-semibold">File vercel.json (Untuk mencegah 404 saat refresh):</span>
                      <button
                        onClick={() => handleCopy(vercelJsonContent, 'vercel_json')}
                        className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                      >
                        {copiedKey === 'vercel_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'vercel_json' ? 'Tersalin' : 'Salin vercel.json'}</span>
                      </button>
                    </div>
                    <pre className="p-2 rounded bg-zinc-900 font-mono text-[10px] text-zinc-300">
                      {vercelJsonContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* OPSI 2: VPS LINUX NGINX */}
              {selectedHosting === 'vps' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">
                      Cara Deploy ke VPS Ubuntu / Debian (Nginx + SSL Let's Encrypt Gratis)
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-900">
                      Kendali Penuh
                    </span>
                  </div>

                  <p className="text-zinc-300 leading-relaxed">
                    Sangat cocok jika kantor ISP Anda memiliki IP Public statis atau VPS lokal/cloud (DigitalOcean, Biznet GIO, Linode, AWS EC2, IDCloudHost).
                  </p>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-300 font-semibold">1. Perintah Setup di Terminal Server:</span>
                      <button
                        onClick={() => handleCopy(`sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs`, 'vps_setup')}
                        className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                      >
                        {copiedKey === 'vps_setup' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'vps_setup' ? 'Tersalin' : 'Salin Perintah'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded bg-zinc-900 font-mono text-[10px] text-emerald-400 overflow-x-auto">
{`# Update server dan install Nginx + Certbot
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx git curl

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs`}
                    </pre>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-300 font-semibold">2. Konfigurasi Nginx Server Block:</span>
                      <button
                        onClick={() => handleCopy(nginxConfigContent, 'nginx_conf')}
                        className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                      >
                        {copiedKey === 'nginx_conf' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'nginx_conf' ? 'Tersalin' : 'Salin Config'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded bg-zinc-900 font-mono text-[10px] text-zinc-300 overflow-x-auto">
                      {nginxConfigContent}
                    </pre>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <span className="font-mono text-zinc-300 font-semibold">3. Pasang SSL HTTPS Gratis (Certbot):</span>
                    <pre className="p-2.5 rounded bg-zinc-900 font-mono text-[10px] text-emerald-400 overflow-x-auto">
{`# Dapatkan sertifikat SSL otomatis dari Let's Encrypt
sudo certbot --nginx -d billing.anuwani.net`}
                    </pre>
                  </div>
                </div>
              )}

              {/* OPSI 3: CPANEL */}
              {selectedHosting === 'cpanel' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">
                      Cara Deploy ke cPanel / Shared Hosting Biasa
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-950 text-orange-400 border border-orange-900">
                      Shared Web Hosting
                    </span>
                  </div>

                  <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                    <li>
                      Di komputer lokal Anda, jalankan perintah <code>npm run build</code>.
                    </li>
                    <li>
                      Buka folder hasil build bernama <code>dist/</code>.
                    </li>
                    <li>
                      Kompres seluruh isi folder <code>dist/</code> menjadi file <code>dist.zip</code>.
                    </li>
                    <li>
                      Login ke <strong>cPanel</strong> akun hosting Anda, buka menu <strong>File Manager</strong>.
                    </li>
                    <li>
                      Masuk ke folder <code>public_html</code> (atau subdomain folder tujuan).
                    </li>
                    <li>
                      Upload file <code>dist.zip</code> lalu klik kanan <strong>Extract</strong>. Pastikan file <code>index.html</code> berada langsung di root <code>public_html</code> (bukan di dalam subfolder dist).
                    </li>
                    <li>
                      Buat file baru bernama <code>.htaccess</code> di dalam <code>public_html</code> dan salin kode di bawah ini:
                    </li>
                  </ol>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-300 font-semibold">File .htaccess untuk cPanel (Wajib Ada):</span>
                      <button
                        onClick={() => handleCopy(htaccessContent, 'htaccess')}
                        className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-semibold"
                      >
                        {copiedKey === 'htaccess' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'htaccess' ? 'Tersalin!' : 'Salin File .htaccess'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded bg-zinc-900 font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-40">
                      {htaccessContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* OPSI 4: NETLIFY */}
              {selectedHosting === 'netlify' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">
                      Cara Deploy ke Netlify (Drag & Drop atau Git)
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-400 border border-teal-900">
                      Alternatif Cepat
                    </span>
                  </div>

                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                    <li>Buka <a href="https://netlify.com" target="_blank" rel="noreferrer" className="text-teal-400 underline font-semibold">Netlify.com</a> dan login.</li>
                    <li>Bisa hubungkan via Git repository atau langsung drag folder <code>dist/</code> ke halaman Netlify Drop.</li>
                    <li>Atur Build command: <code>npm run build</code> dan Publish directory: <code>dist</code>.</li>
                    <li>Buat file <code>_redirects</code> di dalam folder <code>public/</code> berisi baris: <code>/* /index.html 200</code>.</li>
                  </ol>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_step6"
                  checked={checklist.step6_deploy || false}
                  onChange={() => toggleChecklist('step6_deploy')}
                  className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="chk_step6" className="text-zinc-300 cursor-pointer">
                  Aplikasi telah sukses di-deploy ke hosting dan URL aplikasi dapat dibuka melalui browser.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* STEP 7: Checklist Pasca-Deployment & Pengujian Live */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          <button
            onClick={() => toggleAccordion(7)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/90 text-left hover:bg-zinc-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center font-mono text-[11px] border border-emerald-800/80">
                7
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Checklist Verifikasi Siap Pakai & Pengujian Live
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Uji coba login, keamanan akun superadmin, pembuatan tagihan massal, dan tes backup database
                </p>
              </div>
            </div>
            {openStep === 7 ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {openStep === 7 && (
            <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/40">
              <p className="text-zinc-300 leading-relaxed">
                Sebelum menyerahkan sistem kepada admin kasir atau teknisi lapangan, lakukan pengujian verifikasi akhir berikut ini:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-500" />
                    <span>1. Keamanan Akun Superadmin</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Akun bawaan sistem adalah username <code>admin</code> dengan password <code>admin123</code>. Segera buka <strong>Manajemen Pengguna</strong> dan ubah password menjadi kombinasi yang kuat dan aman.
                  </p>
                  <label className="flex items-center gap-2 text-zinc-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.step8_admin_pwd || false}
                      onChange={() => toggleChecklist('step8_admin_pwd')}
                      className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-950 border-zinc-700"
                    />
                    <span>Password default superadmin telah diubah</span>
                  </label>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>2. Generate Tagihan Massal Baru</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Buka menu <strong>Tagihan</strong>, klik <strong>"+ Generate Tagihan Massal"</strong>, pilih bulan target, periksa preview daftar pelanggan, dan konfirmasi pembuatan tagihan.
                  </p>
                  <label className="flex items-center gap-2 text-zinc-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.step7_ssl || false}
                      onChange={() => toggleChecklist('step7_ssl')}
                      className="w-3.5 h-3.5 rounded text-emerald-600 bg-zinc-950 border-zinc-700"
                    />
                    <span>Uji coba generate tagihan bulanan berhasil</span>
                  </label>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span>3. Tes Pencadangan Database (Backup Now)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Buka tab <strong>Aplikasi & Supabase</strong> di menu ini, lalu klik tombol <strong>"Cadangkan Database Sekarang"</strong> untuk mengunduh arsip file JSON cadangan seluruh data pelanggan dan keuangan.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>4. Tes Notifikasi WhatsApp Pelanggan</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Coba klik tombol <strong>Auto-Reminder Bot WA</strong> di menu Tagihan atau kirim kuitansi lunas untuk memastikan pesan masuk ke nomor WhatsApp tujuan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
