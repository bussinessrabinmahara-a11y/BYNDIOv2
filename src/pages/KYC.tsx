import { useState, useRef, useEffect } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Shield, Upload, CheckCircle, Clock, AlertCircle, FileText, Camera, X, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { toastSuccess, toast } from '../components/Toast';

type KYCStep = 'intro' | 'personal' | 'documents' | 'selfie' | 'review' | 'submitted';

interface UploadedFile { name: string; url: string; path: string; }

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

function FileUploadField({
  label, required, accept, hint, userId, folder, onUploaded, uploaded
}: {
  label: string; required?: boolean; accept?: string; hint?: string;
  userId: string; folder: string; onUploaded: (f: UploadedFile) => void; uploaded?: UploadedFile;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) { setError('Only JPG, PNG, WebP or PDF allowed'); return; }

    setUploading(true); setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `kyc/${userId}/${folder}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path);
      onUploaded({ name: file.name, url: urlData.publicUrl, path });
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {uploaded ? (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle size={14} className="text-green-600 shrink-0" />
          <span className="text-[12px] text-green-700 flex-1 truncate font-semibold">{uploaded.name}</span>
          <a href={uploaded.url} target="_blank" rel="noopener" className="text-[#1565C0] hover:underline text-[11px] shrink-0 flex items-center gap-1">
            <Eye size={11} /> View
          </a>
          <button onClick={() => { if (inputRef.current) inputRef.current.value = ''; onUploaded({ name: '', url: '', path: '' }); }}
            className="text-gray-400 hover:text-red-500 shrink-0"><X size={13} /></button>
        </div>
      ) : (
        <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-md cursor-pointer transition-colors
          ${uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-[#90CAF9] hover:border-[#1565C0] hover:bg-[#F0F8FF]'}`}>
          <input ref={inputRef} type="file" accept={accept || 'image/*,.pdf'} className="hidden" onChange={handleFile} disabled={uploading} />
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] text-gray-500">Uploading...</span></>
          ) : (
            <><Upload size={14} className="text-[#1565C0] shrink-0" />
            <div>
              <div className="text-[12px] font-semibold text-[#1565C0]">Click to upload</div>
              {hint && <div className="text-[10px] text-gray-400">{hint}</div>}
            </div></>
          )}
        </label>
      )}
      {error && <div className="text-[11px] text-red-600 flex items-center gap-1"><AlertCircle size={11} />{error}</div>}
    </div>
  );
}

export default function KYC() {
  usePageTitle('KYC Verification');
  const { user } = useAppStore();
  const [step, setStep] = useState<KYCStep>('intro');
  const [loading, setLoading] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: user?.name || '', dob: '', pan: '', aadhaar: '',
    gst: '', bankAccount: '', ifsc: '', bankName: '', address: '', pincode: '', state: 'Maharashtra',
  });
  const [uploads, setUploads] = useState<Record<string, UploadedFile>>({});
  const [selfie, setSelfie] = useState<UploadedFile | null>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const [selfieUploading, setSelfieUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('kyc_submissions').select('status').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setExistingStatus(data.status); });
  }, [user?.id]);

  const setUpload = (key: string, file: UploadedFile) => setUploads(u => ({ ...u, [key]: file }));
  const inp = (label: string, field: keyof typeof form, placeholder: string, required = true, type = 'text') => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder} required={required}
        className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]" />
    </div>
  );

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast('Selfie must be under 5MB', 'error'); return; }
    setSelfieUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `kyc/${user.id}/selfie/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path);
      setSelfie({ name: file.name, url: urlData.publicUrl, path });
    } catch (err: any) {
      toast(err.message || 'Selfie upload failed', 'error');
    } finally {
      setSelfieUploading(false);
    }
  };

  const validatePersonal = () => {
    if (!form.fullName.trim()) { toast('Full name is required', 'error'); return false; }
    if (!form.dob) { toast('Date of birth is required', 'error'); return false; }
    if (!form.address.trim()) { toast('Address is required', 'error'); return false; }
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) { toast('Valid 6-digit pincode required', 'error'); return false; }
    return true;
  };

  const validateDocuments = () => {
    if (!form.pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan.toUpperCase())) { toast('Valid PAN number required (e.g. ABCDE1234F)', 'error'); return false; }
    if (!form.aadhaar || form.aadhaar.replace(/\s/g, '').length !== 12) { toast('Valid 12-digit Aadhaar required', 'error'); return false; }
    if (!form.bankAccount.trim()) { toast('Bank account number is required', 'error'); return false; }
    if (!form.ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) { toast('Valid IFSC code required (e.g. HDFC0001234)', 'error'); return false; }
    if (!form.bankName.trim()) { toast('Bank name is required', 'error'); return false; }
    if (!form.gst || form.gst.trim().length !== 15) { toast('Valid 15-digit GSTIN is required', 'error'); return false; }
    if (!uploads['gst']) { toast('GST Certificate document is required', 'error'); return false; }
    return true;
  };

  const handleSubmitKYC = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('kyc_submissions').upsert({
        user_id: user.id,
        full_name: form.fullName.trim(),
        dob: form.dob,
        pan_number: form.pan.toUpperCase().trim(),
        aadhaar_number: form.aadhaar.replace(/\s/g, ''),
        gst_number: form.gst.trim() || null,
        bank_account: form.bankAccount.trim(),
        ifsc_code: form.ifsc.toUpperCase().trim(),
        bank_name: form.bankName.trim(),
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        state: form.state,
        // Document URLs
        pan_doc_url: uploads['pan']?.url || null,
        aadhaar_doc_url: uploads['aadhaar']?.url || null,
        gst_doc_url: uploads['gst']?.url || null,
        selfie_url: selfie?.url || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      setStep('submitted');
      toastSuccess('KYC submitted successfully! We\'ll review within 24–48 hours.');
    } catch (err: any) {
      toast('Submission failed: ' + (err.message || 'Please try again'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'selfie', label: 'Selfie', icon: '🤳' },
    { id: 'review', label: 'Review', icon: '✅' },
  ];
  const currentStepIndex = steps.findIndex(s => s.id === step);

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <Shield size={48} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-black mb-2">Login to start KYC</h2>
      <Link to="/" className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-md font-bold mt-4">Go Home</Link>
    </div>
  );

  // Already submitted - show status
  if (existingStatus && step !== 'submitted') return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
        {existingStatus === 'approved' ? (
          <><div className="text-6xl mb-4">✅</div>
          <div className="text-xl font-black text-[#2E7D32] mb-2">KYC Approved!</div>
          <p className="text-gray-500 text-[13px]">Your identity is verified. All features are unlocked.</p></>
        ) : existingStatus === 'rejected' ? (
          <><div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-black text-red-600 mb-2">KYC Rejected</div>
          <p className="text-gray-500 text-[13px] mb-4">Your submission was rejected. Please resubmit with correct details.</p>
          <button onClick={() => setExistingStatus(null)} className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-md font-bold">Resubmit KYC</button></>
        ) : (
          <><div className="text-6xl mb-4">⏳</div>
          <div className="text-xl font-black text-[#F57C00] mb-2">KYC Under Review</div>
          <p className="text-gray-500 text-[13px]">Your documents are being verified. We'll notify you within 24–48 hours.</p></>
        )}
      </div>
    </div>
  );

  if (step === 'submitted') return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="text-6xl mb-4">🎉</div>
        <div className="text-xl font-black text-[#0D47A1] mb-2">KYC Submitted!</div>
        <p className="text-gray-500 text-[13px] mb-4">Your documents are under review. We'll notify you within <strong>24–48 hours</strong>.</p>
        <div className="bg-[#E8F5E9] rounded-xl p-4 text-left mb-5">
          <div className="text-[13px] font-bold text-[#2E7D32] mb-2">What happens next?</div>
          <div className="flex flex-col gap-1.5 text-[12px] text-[#388E3C]">
            <div>✓ Our team verifies your documents</div>
            <div>✓ Email confirmation within 48 hours</div>
            <div>✓ Once approved, full seller/creator features unlock</div>
            <div>✓ Bank withdrawals become available instantly</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[13px] text-[#F57C00] font-semibold">
          <Clock size={16} /> Status: Pending Review
        </div>
        <Link to="/" className="mt-4 inline-block text-[#1565C0] text-sm hover:underline">← Back to Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] rounded-2xl p-6 text-white mb-5">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} />
            <div>
              <div className="text-xl font-black">KYC Verification</div>
              <div className="text-white/75 text-[12px]">Verify your identity to unlock full features</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[{ icon: '🏦', text: 'Enable withdrawals' }, { icon: '✅', text: 'Verified badge' }, { icon: '🔓', text: 'Full access' }].map((b, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-2.5 text-center text-[11px]"><div className="text-lg mb-1">{b.icon}</div>{b.text}</div>
            ))}
          </div>
        </div>

        {step === 'intro' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-[16px] font-black mb-4">Documents You'll Need</div>
            <div className="flex flex-col gap-3 mb-6">
              {[
                { icon: '🪪', title: 'PAN Card', desc: 'Upload a clear photo or scan', required: true },
                { icon: '📋', title: 'Aadhaar Card', desc: 'Front side photo/scan', required: true },
                { icon: '📑', title: 'GST Certificate', desc: 'Scan of your registration', required: true },
                { icon: '🏦', title: 'Bank Details', desc: 'Account number & IFSC code', required: true },
                { icon: '🤳', title: 'Selfie', desc: 'Clear face photo for identity match', required: true },
              ].map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">{doc.icon}</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{doc.title}</div>
                    <div className="text-[11px] text-gray-500">{doc.desc}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    Required
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-[#E3F2FD] rounded-lg p-3 mb-4 text-[12px] text-[#0D47A1] flex gap-2">
              <Shield size={14} className="shrink-0 mt-0.5" />
              <span>Files are encrypted and stored securely. Max 5MB per file. JPG, PNG, WebP or PDF accepted.</span>
            </div>
            <button onClick={() => setStep('personal')} className="w-full bg-[#0D47A1] hover:bg-[#1565C0] text-white py-3 rounded-md font-black text-[14px] transition-colors">
              Start KYC Verification →
            </button>
          </div>
        )}

        {['personal', 'documents', 'selfie', 'review'].includes(step) && (
          <>
            {/* Step progress */}
            <div className="flex items-center justify-between mb-5 bg-white rounded-xl p-4 shadow-sm">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-colors
                    ${i < currentStepIndex ? 'bg-[#2E7D32] text-white' : i === currentStepIndex ? 'bg-[#0D47A1] text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {i < currentStepIndex ? '✓' : s.icon}
                  </div>
                  <div className="hidden sm:block text-[11px] font-semibold text-gray-600">{s.label}</div>
                  {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-[#2E7D32]' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              {step === 'personal' && (
                <>
                  <div className="text-[16px] font-black mb-4">👤 Personal Information</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inp('Full Name (as per PAN)', 'fullName', 'Your legal full name')}
                    {inp('Date of Birth', 'dob', '', true, 'date')}
                    <div className="sm:col-span-2">{inp('Address', 'address', 'House/Flat No, Street, Area')}</div>
                    {inp('Pincode', 'pincode', '400001')}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">State <span className="text-red-500">*</span></label>
                      <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                        className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] bg-white">
                        {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => validatePersonal() && setStep('documents')}
                    className="w-full mt-5 bg-[#0D47A1] hover:bg-[#1565C0] text-white py-3 rounded-md font-black text-[14px] transition-colors">
                    Next: Documents →
                  </button>
                </>
              )}

              {step === 'documents' && (
                <>
                  <div className="text-[16px] font-black mb-4">📄 Documents & Bank Details</div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {inp('PAN Number', 'pan', 'ABCDE1234F')}
                      {inp('Aadhaar Number', 'aadhaar', 'XXXX XXXX XXXX')}
                    </div>
                    {user && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FileUploadField label="PAN Card Document" required userId={user.id} folder="pan"
                          hint="JPG, PNG or PDF, max 5MB" uploaded={uploads['pan']}
                          onUploaded={f => f.url ? setUpload('pan', f) : setUploads(u => { const n = {...u}; delete n['pan']; return n; })} />
                        <FileUploadField label="Aadhaar Document" required userId={user.id} folder="aadhaar"
                          hint="Front side, JPG or PDF" uploaded={uploads['aadhaar']}
                          onUploaded={f => f.url ? setUpload('aadhaar', f) : setUploads(u => { const n = {...u}; delete n['aadhaar']; return n; })} />
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-[13px] font-black mb-3">Bank Account Details</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {inp('Bank Account Number', 'bankAccount', 'Your account number')}
                        {inp('IFSC Code', 'ifsc', 'HDFC0001234')}
                        {inp('Bank Name', 'bankName', 'HDFC Bank')}
                        {inp('GST Number (Mandatory)', 'gst', '22AAAAA0000A1Z5', true)}
                      </div>
                      {form.gst && user && (
                        <div className="mt-3">
                          <FileUploadField label="GST Certificate (Mandatory)" required userId={user.id} folder="gst"
                            hint="GST registration certificate" uploaded={uploads['gst']}
                            onUploaded={f => f.url ? setUpload('gst', f) : setUploads(u => { const n = {...u}; delete n['gst']; return n; })} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setStep('personal')} className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-md font-bold text-[13px] hover:bg-gray-50">← Back</button>
                    <button onClick={() => validateDocuments() && setStep('selfie')} className="flex-1 bg-[#0D47A1] hover:bg-[#1565C0] text-white py-3 rounded-md font-black text-[14px] transition-colors">
                      Next: Selfie →
                    </button>
                  </div>
                </>
              )}

              {step === 'selfie' && (
                <>
                  <div className="text-[16px] font-black mb-4">🤳 Identity Selfie</div>
                  <div className="mb-4">
                    {selfie ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
                        <img src={selfie.url} alt="Selfie" className="w-full max-h-64 object-cover" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <a href={selfie.url} target="_blank" rel="noopener"
                            className="bg-white/90 px-2 py-1 rounded text-[11px] font-bold text-[#1565C0] hover:bg-white flex items-center gap-1">
                            <Eye size={11} /> View
                          </a>
                          <button onClick={() => setSelfie(null)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-[11px] font-bold hover:bg-red-600 flex items-center gap-1">
                            <X size={11} /> Retake
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 text-white text-center py-1.5 text-[12px] font-bold">
                          ✅ Selfie uploaded successfully
                        </div>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors
                        ${selfieUploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-[#90CAF9] hover:border-[#1565C0] hover:bg-[#F0F8FF]'}`}>
                        <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieUpload} disabled={selfieUploading} />
                        {selfieUploading ? (
                          <><div className="w-8 h-8 border-3 border-[#1565C0] border-t-transparent rounded-full animate-spin mb-3" />
                          <div className="text-[13px] text-gray-500 font-semibold">Uploading selfie...</div></>
                        ) : (
                          <><Camera size={40} className="text-[#90CAF9] mb-3" />
                          <div className="text-[14px] font-bold text-[#1565C0] mb-1">Take or Upload Selfie</div>
                          <div className="text-[12px] text-gray-400 text-center">On mobile: tap to open camera<br/>On desktop: upload a photo</div></>
                        )}
                      </label>
                    )}
                  </div>
                  <div className="bg-[#E8F5E9] rounded-lg p-3 mb-4">
                    <div className="text-[12px] text-[#2E7D32] font-semibold mb-1">✅ Selfie Guidelines:</div>
                    <div className="text-[11px] text-[#388E3C] grid grid-cols-2 gap-1">
                      <div>• Face clearly visible</div>
                      <div>• No mask or glasses</div>
                      <div>• Good natural lighting</div>
                      <div>• Plain background</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('documents')} className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-md font-bold text-[13px] hover:bg-gray-50">← Back</button>
                    <button onClick={() => { if (!selfie) { toast('Please upload your selfie to continue', 'error'); return; } setStep('review'); }}
                      className="flex-1 bg-[#0D47A1] hover:bg-[#1565C0] text-white py-3 rounded-md font-black text-[14px] transition-colors">
                      Next: Review →
                    </button>
                  </div>
                </>
              )}

              {step === 'review' && (
                <>
                  <div className="text-[16px] font-black mb-4">✅ Review & Submit</div>
                  <div className="flex flex-col gap-2 mb-5">
                    {[
                      { label: 'Full Name', value: form.fullName },
                      { label: 'Date of Birth', value: form.dob },
                      { label: 'PAN Number', value: form.pan.toUpperCase() },
                      { label: 'Aadhaar', value: form.aadhaar ? '****' + form.aadhaar.replace(/\s/g,'').slice(-4) : '—' },
                      { label: 'GST Number', value: form.gst || '—' },
                      { label: 'Bank Account', value: form.bankAccount ? '****' + form.bankAccount.slice(-4) : '—' },
                      { label: 'IFSC', value: form.ifsc.toUpperCase() },
                      { label: 'Bank Name', value: form.bankName },
                      { label: 'Address', value: form.address },
                      { label: 'State', value: form.state },
                    ].map((r, i) => r.value && r.value !== '—' ? (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                        <span className="text-[12px] text-gray-500 font-semibold">{r.label}</span>
                        <span className="text-[13px] font-bold">{r.value}</span>
                      </div>
                    ) : null)}
                    <div className="flex gap-3 p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-[12px] text-gray-500 font-semibold">Documents</span>
                      <div className="flex gap-2 flex-wrap ml-auto">
                        {uploads['pan'] && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ PAN</span>}
                        {uploads['aadhaar'] && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Aadhaar</span>}
                        {selfie && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Selfie</span>}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#E3F2FD] rounded-lg p-3 mb-4 text-[12px] text-[#1565C0]">
                    <strong>Declaration:</strong> I confirm all information is accurate and documents are genuine. I consent to BYNDIO verifying my identity for KYC compliance under applicable Indian law.
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('selfie')} className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-md font-bold text-[13px] hover:bg-gray-50">← Back</button>
                    <button onClick={handleSubmitKYC} disabled={loading}
                      className="flex-1 bg-[#2E7D32] hover:bg-[#388E3C] text-white py-3 rounded-md font-black text-[14px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</> : '🚀 Submit KYC'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
