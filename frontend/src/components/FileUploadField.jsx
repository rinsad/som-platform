import { useId } from 'react';
import './FileUploadField.css';

// Brand-styled file picker: the real <input type="file"> is pinned on top of a
// styled button at opacity 0 (not display:none, so it still receives clicks and
// keyboard focus). Keeping it inside the position:relative wrapper means
// focusing it after the OS file dialog closes never scroll-jumps the page — the
// same technique used by Checkbox.jsx.
//
// While uploading, a gray fill grows across the button to `progress` (0–100).
//
//   <FileUploadField onChange={handleUpload} uploading={busy} progress={pct} />
export default function FileUploadField({
  onChange,
  accept,
  disabled = false,
  uploading = false,
  progress = 0,
  'aria-label': ariaLabel = 'Upload file',
}) {
  const id = useId();
  const pct = Math.max(0, Math.min(100, progress));

  return (
    <div className="som-file-upload" data-disabled={disabled || undefined}>
      <span className="som-file-upload-control">
        <input
          id={id}
          className="som-file-upload-input"
          type="file"
          accept={accept}
          disabled={disabled || uploading}
          onChange={onChange}
          aria-label={ariaLabel}
        />
        <span className="som-file-upload-btn" data-uploading={uploading || undefined} aria-hidden="true">
          <span className="som-file-upload-fill" style={{ width: `${uploading ? pct : 0}%` }} />
          <span className="som-file-upload-btn-content">
            <UploadIcon />
            {uploading ? `Uploading… ${pct}%` : 'Upload File'}
          </span>
        </span>
      </span>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
