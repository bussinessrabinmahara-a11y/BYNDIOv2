import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Download, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

interface UploadResult { success: number; errors: string[] }

interface ParsedRow {
  name?: string; description?: string; category?: string;
  price?: string; mrp?: string; stock_quantity?: string;
  sku?: string; gst_rate?: string; hsn_code?: string; images?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row as ParsedRow;
  });
}

export default function BulkUpload({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAppStore();
  const [results, setResults] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csv = [
      'name,description,category,price,mrp,stock_quantity,sku,gst_rate,hsn_code,images',
      'Example T-Shirt,Cotton blend round neck,Fashion,499,999,100,SKU001,18,6203,https://example.com/image.jpg',
      'Wireless Earbuds,BT 5.0 earbuds,Electronics,1299,2499,50,SKU002,18,8518,https://example.com/earbuds.jpg',
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'byndio-products-template.csv';
    a.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setPreview(rows.slice(0, 3));

      const errors: string[] = [];
      const toInsert: Record<string, unknown>[] = [];

      rows.forEach((row, i) => {
        const num = i + 2;
        if (!row.name?.trim()) { errors.push(`Row ${num}: name is required`); return; }
        if (!row.category?.trim()) { errors.push(`Row ${num}: category is required`); return; }
        const price = parseFloat(row.price || '');
        const mrp = parseFloat(row.mrp || '');
        if (isNaN(price) || price <= 0) { errors.push(`Row ${num}: invalid price "${row.price}"`); return; }
        if (isNaN(mrp) || mrp < price) { errors.push(`Row ${num}: MRP must be >= price`); return; }
        toInsert.push({
          seller_id: user.id,
          name: row.name.trim(),
          description: row.description?.trim() || '',
          category: row.category.trim(),
          price, mrp,
          stock_quantity: parseInt(row.stock_quantity || '0') || 0,
          sku: row.sku?.trim() || null,
          gst_rate: parseFloat(row.gst_rate || '18') || 18,
          hsn_code: row.hsn_code?.trim() || null,
          images: row.images ? [row.images.trim()] : [],
          is_active: true,
          specifications: {},
        });
      });

      let successCount = 0;
      if (toInsert.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const { error } = await supabase.from('products').insert(toInsert.slice(i, i + batchSize));
          if (error) errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          else successCount += Math.min(batchSize, toInsert.length - i);
        }
      }

      setResults({ success: successCount, errors: errors.length ? errors : (successCount === 0 ? ['No valid rows found'] : []) });
      if (successCount > 0) onSuccess();
      setUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[520px] shadow-2xl overflow-hidden">
        <div className="bg-[#0D47A1] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-black text-[16px]">Bulk Product Upload</div>
            <div className="text-[11px] opacity-75">Upload multiple products via CSV file</div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-lg p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-[#0D47A1]">Step 1: Download Template</div>
              <div className="text-[11px] text-gray-600 mt-0.5">Fill in your products following the exact column format</div>
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-3 py-1.5 rounded-md text-[12px] font-bold hover:bg-[#1565C0] transition-colors whitespace-nowrap">
              <Download size={13} /> Template
            </button>
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-600 mb-2">Step 2: Upload your filled CSV</div>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-[#0D47A1] hover:bg-[#E3F2FD]'}`}>
              <Upload size={28} className={uploading ? 'text-gray-300' : 'text-[#0D47A1]'} />
              <div className="font-bold text-[13px] mt-2 text-center">{uploading ? 'Processing...' : 'Click to upload CSV'}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Max 500 products per upload</div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
          </div>
          {preview.length > 0 && !results && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-[12px] font-bold mb-2 text-gray-600">Preview (first {preview.length} rows):</div>
              {preview.map((row, i) => (
                <div key={i} className="text-[11px] text-gray-600 py-0.5">{i + 1}. {row.name} — ₹{row.price} ({row.category})</div>
              ))}
            </div>
          )}
          {uploading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-gray-600">Uploading products to database...</span>
            </div>
          )}
          {results && (
            <div className={`rounded-lg p-4 ${results.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {results.success > 0 && (
                <div className="flex items-center gap-2 text-green-700 font-bold text-[13px] mb-2">
                  <CheckCircle size={16} /> {results.success} product{results.success !== 1 ? 's' : ''} uploaded successfully!
                </div>
              )}
              {results.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-red-700 font-bold text-[12px] mb-1.5">
                    <AlertCircle size={14} /> {results.errors.length} issue{results.errors.length !== 1 ? 's' : ''}:
                  </div>
                  <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1">
                    {results.errors.map((err, i) => <div key={i} className="text-[11px] text-red-600">{err}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-[13px] font-semibold hover:bg-gray-50 transition-colors">
              {results?.success ? 'Done' : 'Cancel'}
            </button>
            {results && (
              <button onClick={() => { setResults(null); setPreview([]); if (fileRef.current) fileRef.current.value = ''; }}
                className="px-4 py-2 bg-[#0D47A1] text-white rounded-md text-[13px] font-bold hover:bg-[#1565C0] transition-colors">
                Upload More
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
