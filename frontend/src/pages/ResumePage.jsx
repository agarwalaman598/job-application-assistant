import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import api from '../api';
import { Upload, FileText, Star, Trash2, Loader2, Link2, Copy, Check, ExternalLink, Plus, X, Download, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function ResumePage() {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);

  // Link-only resume form
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  // Inline drive-link editing per resume
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [editLinkVal, setEditLinkVal] = useState('');

  // Copy feedback per resume
  const [copiedId, setCopiedId] = useState(null);

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
      toast.success('Resume uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files[0]);
  };

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

  const handleAddLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    setAddingLink(true);
    try {
      await api.post('/resumes/link', { title: linkTitle.trim(), url: linkUrl.trim() });
      setLinkTitle('');
      setLinkUrl('');
      setShowLinkForm(false);
      fetchResumes();
    } catch (err) { console.error(err); }
    finally { setAddingLink(false); }
  };

  const startEditLink = (r) => {
    setEditingLinkId(r.id);
    setEditLinkVal(r.drive_link || '');
  };

  const saveEditLink = async (id) => {
    try {
      await api.patch(`/resumes/${id}/link`, { drive_link: editLinkVal.trim() || null });
      setEditingLinkId(null);
      fetchResumes();
    } catch (err) { console.error(err); }
  };

  const copyLink = (r) => {
    navigator.clipboard.writeText(r.drive_link);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const [downloadingId, setDownloadingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const handleDownload = async (r) => {
    setDownloadingId(r.id);
    try {
      const response = await api.get(`/resumes/${r.id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setAlertMsg('Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (r) => {
    setViewingId(r.id);
    try {
      const response = await api.get(`/resumes/${r.id}/download`, {
        responseType: 'blob',
        params: { mode: 'view' },
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after tab has loaded
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      setAlertMsg('Failed to open PDF. Please try again.');
    } finally {
      setViewingId(null);
    }
  };

  const inputStyle = {
    background: 'var(--input)',
    border: '1px solid var(--border)',
    borderRadius: 7,
    color: 'var(--foreground)',
    fontSize: '0.82rem',
    padding: '6px 10px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      <Helmet><title>Resumes | JobAssist AI</title></Helmet>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Resumes</h1>

      {/* Upload area */}
      <div className="card p-8 mb-3 animate-enter"
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

      {/* Add link-only resume */}
      <div className="card mb-6 animate-enter" style={{ overflow: 'hidden' }}>
        <button
          onClick={() => setShowLinkForm(v => !v)}
          className="flex items-center gap-2 w-full"
          style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <Link2 size={14} />
          <span>Add a link-only resume</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted-foreground)', opacity: 0.6 }}>{showLinkForm ? '▲' : '▼'}</span>
        </button>
        {showLinkForm && (
          <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', margin: '10px 0 8px' }}>No PDF needed — just a title and a Google Drive (or other) link.</p>
            <div className="flex flex-col gap-2">
              <input
                style={inputStyle}
                placeholder="Title (e.g. SWE Resume 2025)"
                value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="URL (Google Drive share link)"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddLink()}
              />
              <div className="flex gap-2 justify-end mt-1">
                <button onClick={() => setShowLinkForm(false)} style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleAddLink}
                  disabled={addingLink || !linkTitle.trim() || !linkUrl.trim()}
                  className="btn-primary flex items-center gap-1"
                  style={{ fontSize: '0.78rem', padding: '5px 13px', opacity: (!linkTitle.trim() || !linkUrl.trim()) ? 0.5 : 1 }}
                >
                  {addingLink ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="card p-8" style={{ textAlign: 'center' }}>
          <FileText size={28} style={{ color: 'var(--muted-foreground)', margin: '0 auto 8px', opacity: 0.3 }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No resumes yet. Upload a PDF or add a link above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {resumes.map((r, i) => {
            const isLinkOnly = !r.has_file;
            return (
              <div key={r.id} className="card animate-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                {/* Main row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ padding: '12px 16px' }}>
                  {/* Left: icon + name/date */}
                  <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                    {isLinkOnly
                      ? <Link2 size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                      : <FileText size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                    }
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.filename}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                        {new Date(r.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                  {/* Right: action buttons — wraps to new line on mobile */}
                  <div className="flex items-center gap-2 flex-wrap" style={{ flexShrink: 0 }}>
                    {!r.is_default && (
                      <button onClick={() => setDefault(r.id)} title="Set as default" className="btn-secondary text-xs flex items-center gap-1">
                        <Star size={12} /> Set default
                      </button>
                    )}
                    {/* Link icon: opens drive_link */}
                    {r.drive_link && (
                      <a href={r.drive_link} target="_blank" rel="noopener noreferrer" title="Open link" style={{ color: 'var(--muted-foreground)', display: 'flex' }}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {/* Edit / add link button (for PDF resumes without a link, or link-only) */}
                    <button
                      onClick={() => editingLinkId === r.id ? setEditingLinkId(null) : startEditLink(r)}
                      title={r.drive_link ? 'Edit link' : 'Add link'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px', display: 'flex' }}
                    >
                      <Link2 size={14} style={{ opacity: r.drive_link ? 1 : 0.45 }} />
                    </button>
                    {r.drive_link && (
                      <button
                        onClick={() => copyLink(r)}
                        title="Copy link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px', display: 'flex' }}
                      >
                        {copiedId === r.id
                          ? <Check size={14} style={{ color: '#4ade80' }} />
                          : <Copy size={14} />
                        }
                      </button>
                    )}
                    {r.has_file && (
                      <>
                        <button
                          onClick={() => handleView(r)}
                          title="View PDF"
                          disabled={viewingId === r.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px', display: 'flex' }}
                        >
                          {viewingId === r.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleDownload(r)}
                          title="Download PDF"
                          disabled={downloadingId === r.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px', display: 'flex' }}
                        >
                          {downloadingId === r.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Download size={14} />}
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteResume(r.id)} title="Delete resume" className="btn-danger flex items-center gap-1 text-xs">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Inline drive-link editor */}
                {editingLinkId === r.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link2 size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Paste Google Drive or other link"
                      value={editLinkVal}
                      onChange={e => setEditLinkVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditLink(r.id); if (e.key === 'Escape') setEditingLinkId(null); }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveEditLink(r.id)}
                      className="btn-primary"
                      style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }}
                    >Save</button>
                    <button
                      onClick={() => setEditingLinkId(null)}
                      title="Cancel"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Drive link chip display (when not editing) */}
                {r.drive_link && editingLinkId !== r.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link2 size={11} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {r.drive_link}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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

