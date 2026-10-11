import React, { useState } from 'react';
import { Bill, Customer } from '../../types';
import { WhatsAppService } from '../../services/whatsappService';
import { X, Printer, Download, CheckCircle, FileText } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  customer?: Customer;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  bill,
  customer
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('thermal');

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        {/* Controls - Hidden during print */}
        <div className="no-print flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-red-500" />
              Cetak Kuitansi Pembayaran
            </h2>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  printFormat === 'thermal' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Struk Thermal (58/80mm)
              </button>
              <button
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  printFormat === 'a4' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Invoice Standar (A4)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 flex items-center gap-1.5 shadow-sm shadow-red-950"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex justify-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          {printFormat === 'thermal' ? (
            /* THERMAL RECEIPT (58mm-80mm width look) */
            <div className="w-[300px] bg-white text-black p-4 text-[12px] font-mono leading-tight shadow-md space-y-3">
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                <div className="text-base font-black tracking-tight">ANUWANINET ISP</div>
                <div className="text-[10px]">RT-RW NET BROADBAND</div>
                <div className="text-[9px] text-gray-600">CS WA: 0812-3456-7890</div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>No. Nota:</span>
                  <span className="font-bold">{bill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{bill.paidAt || new Date().toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold truncate max-w-[170px]">{bill.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID Klien:</span>
                  <span>{customer?.customerCode || 'ANW-KLIEN'}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-1.5 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>{bill.packageName}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>Periode: {bill.period}</span>
                  <span className="font-bold">{WhatsAppService.formatRupiah(bill.amount)}</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>TOTAL LUNAS:</span>
                  <span>{WhatsAppService.formatRupiah(bill.amount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Metode:</span>
                  <span className="uppercase">{(bill.paymentMethod || 'Transfer')}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Status:</span>
                  <span className="font-bold text-gray-800">LUNAS / AKTIF</span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-gray-400 pt-2 text-[10px] text-gray-600 space-y-0.5">
                <div>Koneksi Internet Aktif Normal</div>
                <div>Terima kasih atas pembayaran Anda!</div>
                <div className="text-[8px] pt-1">Simpan struk ini sebagai bukti pembayaran sah.</div>
              </div>
            </div>
          ) : (
            /* A4 INVOICE SHEET */
            <div className="w-full bg-white text-black p-6 rounded-lg text-xs font-sans space-y-4 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b-2 border-red-600">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-red-600">
                    ANUWANINET <span className="text-black">BROADBAND</span>
                  </h1>
                  <p className="text-[10px] text-gray-600">
                    Penyedia Jasa Internet & Jaringan RT-RW Net Mandiri
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Jl. Jaringan Telekomunikasi No. 1 · WhatsApp: 0812-3456-7890
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold uppercase text-gray-800">KUITANSI RESMI</div>
                  <div className="font-mono text-xs font-semibold text-gray-700">{bill.billNumber}</div>
                  <div className="text-[10px] text-gray-500">Tgl Cetak: {new Date().toLocaleString('id-ID')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Ditagihkan Kepada:</div>
                  <div className="font-bold text-gray-900 text-sm">{bill.customerName}</div>
                  <div className="text-gray-600 font-mono">ID: {customer?.customerCode || 'ANW-KLIEN'} · Telp: {bill.customerPhone}</div>
                  <div className="text-gray-600 text-[11px]">{customer?.address || 'Area Pelanggan AnuwaniNet'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Rincian Tagihan:</div>
                  <div className="text-gray-800">Periode: <span className="font-semibold">{bill.period}</span></div>
                  <div className="text-gray-800">Jatuh Tempo: <span className="font-semibold">{bill.dueDate}</span></div>
                  <div className="text-emerald-700 font-bold mt-1">STATUS: {bill.status === 'paid' ? 'LUNAS (TERVERIFIKASI)' : 'BELUM LUNAS'}</div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <th className="p-2">Deskripsi Layanan</th>
                    <th className="p-2">Username PPPoE</th>
                    <th className="p-2 text-right">Durasi</th>
                    <th className="p-2 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 font-medium">
                      <div>Langganan Internet: {bill.packageName}</div>
                      <div className="text-[10px] text-gray-500">Bandwidth unlimited 24 jam nonstop</div>
                    </td>
                    <td className="p-2 font-mono text-gray-700">{customer?.pppoeUsername || '-'}</td>
                    <td className="p-2 text-right">1 Bulan</td>
                    <td className="p-2 text-right font-bold font-mono">{WhatsAppService.formatRupiah(bill.amount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={3} className="p-2 text-right">TOTAL PEMBAYARAN:</td>
                    <td className="p-2 text-right font-mono text-sm text-red-600">
                      {WhatsAppService.formatRupiah(bill.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-[10px] text-gray-500">
                <div>
                  Metode: <span className="font-bold text-gray-800 uppercase">{bill.paymentMethod || 'Transfer'}</span> · Ref: {bill.transactionRef || 'TRX-PAID-01'}
                </div>
                <div className="text-right italic">
                  Dicetak secara otomatis oleh sistem AnuwaniNet Core
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
