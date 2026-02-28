import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Upload, FileText, Star, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function ResumePage() {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return alert('Only PDF files');
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

  const deleteResume = async (id) => {
    if (!confirm('Delete this resume?')) return;
    await api.delete(`/resumes/${id}`);
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
              Drop a PDF here or <span style={{ color: 'var(--primary)', fontWeight: 500 }}>browse</span>
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
                <FileText size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.filename}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                    {new Date(r.uploaded_at).toLocaleDateString()}
                    {r.is_default && <span style={{ color: 'var(--primary)', marginLeft: '8px', fontWeight: 600 }}>★ Default</span>}
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
    </div>
  );
}
