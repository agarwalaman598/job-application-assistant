import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Upload, FileText, Star, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function ResumePage() {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return setAlertMsg('Only PDF files are supported. Please upload a .pdf file.');
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await api.post('/resumes/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchResumes();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files[0]);
  }, []);

  const setDefault = async (id) => {
    await api.put(`/resumes/${id}/default`);
    fetchResumes();
  };

  const deleteResume = (id) => setConfirmDeleteId(id);

  const confirmDeleteResume = async () => {
    await api.delete(`/resumes/${confirmDeleteId}`);
    setConfirmDeleteId(null);
    fetchResumes();
  };

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Resumes</h1>

      {/* Upload area */}
      <div className="card p-8 mb-6 animate-enter"
        style={{
          textAlign: 'center',
          border: dragOver ? '2px dashed var(--primary)' : '1px solid var(--border)',
          cursor: 'pointer',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.pdf'; i.onchange = (e) => handleUpload(e.target.files[0]); i.click(); }}>
        {uploading ? (
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto' }} />
        ) : (
          <>
            <Upload size={28} style={{ color: 'var(--muted-foreground)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              Drop a PDF here or <span style={{ color: 'var(--foreground)', fontWeight: 600, textDecoration: 'underline', textDecorationColor: '#3a3a3a', textUnderlineOffset: '3px' }}>browse</span>
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>PDF only, max 10MB</p>
          </>
        )}
      </div>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center' }}>
          <FileText size={28} style={{ color: 'var(--muted-foreground)', margin: '0 auto 8px', opacity: 0.3 }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No resumes uploaded yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {resumes.map((r, i) => (
            <div key={r.id} className="card p-4 flex items-center justify-between animate-enter"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-center gap-3">
                <FileText size={18} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.filename}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                    {new Date(r.uploaded_at).toLocaleDateString()}
                    {r.is_default && (
                      <span style={{
                        marginLeft: 8, fontSize: '0.7rem', fontWeight: 600,
                        color: 'var(--foreground)', letterSpacing: '-0.01em',
                        background: '#252525', border: '1px solid #303030',
                        padding: '1px 7px', borderRadius: 5,
                      }}>★ Default</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!r.is_default && (
                  <button onClick={() => setDefault(r.id)} className="btn-secondary text-xs flex items-center gap-1">
                    <Star size={12} /> Set default
                  </button>
                )}
                <button onClick={() => deleteResume(r.id)} className="btn-danger flex items-center gap-1 text-xs">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete resume"
        message="This will permanently remove the resume from your account."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteResume}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={!!alertMsg}
        title="Heads up"
        message={alertMsg}
        confirmLabel="Got it"
        onConfirm={() => setAlertMsg(null)}
      />
    </div>
  );
}
