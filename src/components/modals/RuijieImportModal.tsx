import React, { useState, useEffect, useMemo } from 'react';
import {
  RuijieService,
  DiscoveredRuijieCustomer
} from '../../services/ruijieService';
import { InternetPackage } from '../../types';
import {
  Router,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Database,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  Wifi,
  Search,
  Filter
} from 'lucide-react';

interface RuijieImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: InternetPackage[];
  onImportSuccess: (count: number) => void;
}

export const RuijieImportModal: React.FC<RuijieImportModalProps> = ({
  isOpen,
  onClose,
  packages,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'upload' | 'template'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredList, setDiscoveredList] = useState<DiscoveredRuijieCustomer[]>([]);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [gatewayInfo, setGatewayInfo] = useState<{ model: string; ip: string; siteId: string; totalDetected: number } | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [saveToDb, setSaveToDb] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterNewOnly, setFilterNewOnly] = useState(false);

  // Auto scan on modal open if list is empty
  useEffect(() => {
    if (isOpen && discoveredList.length === 0) {
      handleScanRuijieGateway();
    }
  }, [isOpen]);

  const handleScanRuijieGateway = async () => {
    setIsScanning(true);
    setNotice(null);
    try {
      const res = await RuijieService.fetchCustomersFromRuijieGateway();
      if (res.success) {
        setDiscoveredList(res.customers);
        setGatewayInfo(res.gatewayInfo);
        // Default select all discovered customers
        setSelectedUsernames(new Set(res.customers.map(c => c.pppoeUsername)));
        setNotice({
          type: 'success',
          message: `${res.message}`
        });
      } else {
        setNotice({
          type: 'error',
          message: 'Gagal terhubung ke gateway Ruijie Reyee.'
        });
      }
    } catch (e: any) {
      setNotice({
        type: 'error',
        message: e?.message || 'Terjadi kesalahan saat memindai gateway.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (!content) return;

      const isJson = file.name.endsWith('.json');
      const res = RuijieService.parseRuijieFile(content, isJson ? 'json' : 'csv');

      if (res.success && res.customers.length > 0) {
        setDiscoveredList(res.customers);
        setSelectedUsernames(new Set(res.customers.map(c => c.pppoeUsername)));
        setNotice({
          type: 'success',
          message: `Berhasil memuat ${res.customers.length} data pelanggan dari file ${file.name}!`
        });
        setActiveTab('scan'); // Switch to preview table
      } else {
        setNotice({
          type: 'error',
          message: res.error || 'Format file Ruijie tidak sesuai atau data kosong.'
        });
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = RuijieService.generateRuijieSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruijie_pelanggan_template_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (selectedUsernames.size === filteredList.length) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(filteredList.map(c => c.pppoeUsername)));
    }
  };

  const toggleSelectOne = (username: string) => {
    const next = new Set(selectedUsernames);
    if (next.has(username)) {
      next.delete(username);
    } else {
      next.add(username);
    }
    setSelectedUsernames(next);
  };

  const handlePackageChange = (username: string, packageId: string) => {
    const selectedPkg = packages.find(p => p.id === packageId);
    if (!selectedPkg) return;

    setDiscoveredList(prev =>
      prev.map(item => {
        if (item.pppoeUsername === username) {
          return {
            ...item,
            packageId: selectedPkg.id,
            packageName: selectedPkg.name,
            packagePrice: selectedPkg.price,
            rateLimit: `${selectedPkg.speedMbps} Mbps`
          };
        }
        return item;
      })
    );
  };

  const filteredList = useMemo(() => {
    return discoveredList.filter(item => {
      const q = searchFilter.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.pppoeUsername.toLowerCase().includes(q) ||
        item.customerCode.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.ipAddress.includes(q);

      const matchNew = !filterNewOnly || !item.isExisting;
      return matchSearch && matchNew;
    });
  }, [discoveredList, searchFilter, filterNewOnly]);

  const selectedCount = selectedUsernames.size;
  const newCount = discoveredList.filter(d => !d.isExisting && selectedUsernames.has(d.pppoeUsername)).length;
  const updateCount = discoveredList.filter(d => d.isExisting && selectedUsernames.has(d.pppoeUsername)).length;

  const handleExecuteImport = () => {
    if (selectedCount === 0) {
      setNotice({ type: 'error', message: 'Silakan pilih setidaknya 1 pelanggan untuk diimpor.' });
      return;
    }

    setIsSubmitting(true);
    const toImport = discoveredList.filter(d => selectedUsernames.has(d.pppoeUsername));

    try {
      const result = RuijieService.importCustomers(toImport, { saveToDatabase: saveToDb });

      if (result.success) {
        onImportSuccess(result.importedCount + result.updatedCount);
        setNotice({
          type: 'success',
          message: `${result.message}`
        });

        setTimeout(() => {
          setIsSubmitting(false);
          onClose();
        }, 1200);
      } else {
        setIsSubmitting(false);
        setNotice({ type: 'error', message: result.message });
      }
    } catch (e: any) {
      setIsSubmitting(false);
      setNotice({ type: 'error', message: e?.message || 'Gagal menyimpan ke database' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30">
              <Router className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Import Pelanggan dari Ruijie Gateway
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-900">
                  Reyee Cloud Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Sinkronisasi akun PPPoE & kredensial langsung dari router Ruijie, lalu simpan permanen ke Database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Gateway Status Bar */}
        <div className="px-4 sm:px-5 pt-3 bg-zinc-950/50 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'scan'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-red-500" />
              <span>Daftar Pelanggan Ruijie ({discoveredList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Upload CSV / JSON eWeb</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'template'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Format Template</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            {gatewayInfo && (
              <div className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{gatewayInfo.model} ({gatewayInfo.ip})</span>
              </div>
            )}
            <button
              onClick={handleScanRuijieGateway}
              disabled={isScanning}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-1.5 border border-zinc-700"
              title="Pindai ulang Ruijie Gateway"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-red-400' : ''}`} />
              <span>{isScanning ? 'Memindai...' : 'Scan Ulang'}</span>
            </button>
          </div>
        </div>

        {/* Notices */}
        {notice && (
          <div
            className={`mx-4 sm:mx-5 mt-3 p-3 rounded-lg text-xs flex items-center gap-2.5 ${
              notice.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                : notice.type === 'error'
                ? 'bg-red-950/70 border border-red-800 text-red-300'
                : 'bg-blue-950/70 border border-blue-800 text-blue-300'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="flex-1 font-medium">{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 hover:border-red-600 transition-colors text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-600/10 text-red-500 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Unggah File Ekspor Ruijie eWeb</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    Pilih file <strong>.CSV</strong> atau <strong>.JSON</strong> hasil unduhan daftar PPPoE User dari Ruijie Reyee Cloud atau web console router RG-EG3250.
                  </p>
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-500 transition-colors cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Dari Komputer</span>
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                <div>
                  <div className="font-semibold text-white">Belum memiliki file ekspor Ruijie?</div>
                  <div className="text-zinc-400 text-[11px]">Unduh contoh template CSV siap isi untuk impor massal.</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold transition-colors border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Sample CSV</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Struktur Kolom CSV Ekspor Ruijie</span>
                </h3>
                <p className="text-zinc-400 text-xs">
                  Sistem otomatis mendeteksi header tabel berikut saat membaca data ekspor router Ruijie:
                </p>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre">
                  username, password, name, phone, address, ip_address, mac_address, package_name, status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 text-zinc-400">
                  <div>• <strong>username:</strong> Username PPPoE (wajib unik)</div>
                  <div>• <strong>password:</strong> Password PPPoE akun</div>
                  <div>• <strong>name:</strong> Nama lengkap pelanggan</div>
                  <div>• <strong>phone:</strong> Nomor telepon / WhatsApp</div>
                  <div>• <strong>ip_address:</strong> IP address statis/DHCP Ruijie</div>
                  <div>• <strong>package_name:</strong> Nama paket (otomatis dicocokkan)</div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-500 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Template (.CSV)</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Preview and Filter Header */}
          <div className="space-y-3">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, username PPPoE, IP, atau kode..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg">
                  <input
                    type="checkbox"
                    checked={filterNewOnly}
                    onChange={e => setFilterNewOnly(e.target.checked)}
                    className="rounded border-zinc-700 text-red-600 focus:ring-0"
                  />
                  <span>Hanya Pelanggan Baru</span>
                </label>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  {selectedUsernames.size === filteredList.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-900/90 text-zinc-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredList.length > 0 && selectedUsernames.size === filteredList.length}
                          onChange={toggleSelectAll}
                          className="rounded border-zinc-700 text-red-600 focus:ring-0"
                        />
                      </th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Pelanggan</th>
                      <th className="p-3">PPPoE Kredensial</th>
                      <th className="p-3">IP & MAC Ruijie</th>
                      <th className="p-3">Paket Layanan Mapped</th>
                      <th className="p-3">Telepon & Alamat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-zinc-500">
                          {isScanning ? (
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                              <span>Sedang memindai router Ruijie Gateway...</span>
                            </div>
                          ) : (
                            'Tidak ada data pelanggan yang cocok dengan pencarian.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredList.map(item => {
                        const isSelected = selectedUsernames.has(item.pppoeUsername);
                        return (
                          <tr
                            key={item.pppoeUsername}
                            onClick={() => toggleSelectOne(item.pppoeUsername)}
                            className={`hover:bg-zinc-900/60 transition-colors cursor-pointer ${
                              isSelected ? 'bg-red-950/20' : ''
                            }`}
                          >
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(item.pppoeUsername)}
                                className="rounded border-zinc-700 text-red-600 focus:ring-0"
                              />
                            </td>

                            <td className="p-3">
                              {item.isExisting ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 whitespace-nowrap">
                                  Sudah Ada (Update)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800 whitespace-nowrap">
                                  Baru di Gateway
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="font-semibold text-white">{item.name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono">{item.customerCode}</div>
                            </td>

                            <td className="p-3 font-mono text-[11px]">
                              <div className="text-red-400 font-medium">{item.pppoeUsername}</div>
                              <div className="text-zinc-500 text-[10px]">Pass: {item.pppoePassword}</div>
                            </td>

                            <td className="p-3 font-mono text-[11px]">
                              <div className="text-zinc-300">{item.ipAddress}</div>
                              <div className="text-zinc-500 text-[10px]">{item.macAddress}</div>
                            </td>

                            <td className="p-3" onClick={e => e.stopPropagation()}>
                              <select
                                value={item.packageId}
                                onChange={e => handlePackageChange(item.pppoeUsername, e.target.value)}
                                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-red-600 w-full"
                              >
                                {packages.map(pkg => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.name} (Rp {pkg.price.toLocaleString('id-ID')})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-3 text-zinc-400 text-[11px]">
                              <div>{item.phone}</div>
                              <div className="truncate max-w-[150px] text-zinc-500" title={item.address}>
                                {item.address}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Direct database persistence toggle */}
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToDb}
                onChange={e => setSaveToDb(e.target.checked)}
                className="rounded border-zinc-700 text-red-600 focus:ring-0"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simpan langsung seluruh data pelanggan ke Database</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isSubmitting || selectedCount === 0}
              className="px-5 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-colors shadow-lg shadow-red-950 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    Impor & Simpan ke Database ({selectedCount} Pelanggan)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
