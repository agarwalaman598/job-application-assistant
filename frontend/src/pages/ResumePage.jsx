import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Upload, FileText, Star, Trash2, Loader2 } from 'lucide-react';

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
    <div className="pt-20 px-6 pb-10 max-w-3xl mx-auto">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>Resumes</h1>

      {/* Upload area */}
      <div className="card p-8 mb-6 animate-enter"
        style={{
          textAlign: 'center',
          border: dragOver ? '2px dashed #d4942e' : '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.pdf'; i.onchange = (e) => handleUpload(e.target.files[0]); i.click(); }}>
        {uploading ? (
          <Loader2 size={28} className="animate-spin" style={{ color: '#d4942e', margin: '0 auto' }} />
        ) : (
          <>
            <Upload size={28} style={{ color: '#5a5a63', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.85rem', color: '#8b8b92' }}>
              Drop a PDF here or <span style={{ color: '#d4942e', fontWeight: 500 }}>browse</span>
            </p>
            <p style={{ fontSize: '0.7rem', color: '#5a5a63', marginTop: '4px' }}>PDF only, max 10MB</p>
          </>
        )}
      </div>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center' }}>
          <FileText size={28} style={{ color: '#2a2a32', margin: '0 auto 8px' }} />
          <p style={{ color: '#5a5a63', fontSize: '0.85rem' }}>No resumes uploaded yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {resumes.map((r, i) => (
            <div key={r.id} className="card p-4 flex items-center justify-between animate-enter"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-center gap-3">
                <FileText size={18} style={{ color: '#d4942e' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.filename}</p>
                  <p style={{ fontSize: '0.7rem', color: '#5a5a63' }}>
                    {new Date(r.uploaded_at).toLocaleDateString()}
                    {r.is_default && <span style={{ color: '#d4942e', marginLeft: '8px', fontWeight: 600 }}>★ Default</span>}
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
