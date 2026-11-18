import { useEffect, useRef, useState } from 'react';
import { BTN_SECONDARY, Check, cx, Image, Loader2, Sparkles, Upload, X } from '../ui';

export interface ScanResult {
  /** 0..1 confidence reported by the AI. */
  confidence: number;
  /** Ambiguities the AI flagged (e.g. "không thấy giờ giao dịch"). */
  notes?: string;
}

interface ScanImagePanelProps {
  /** Called with the chosen / dropped / pasted image. */
  onFile: (file: File) => void;
  scanning: boolean;
  disabled?: boolean;
  result?: ScanResult | null;
  /** Clears the preview and the last result. */
  onClear?: () => void;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * "Đọc ảnh bằng AI" block of the add-transaction form, in the VS Code style of the rest of
 * the app: a bordered widget with a codicon title row, a dashed drop target and secondary
 * buttons. Accepts receipts and bank-transfer screenshots from the photo library (no
 * `capture`, which would force the camera on phones), the camera, drag & drop and paste.
 */
export function ScanImagePanel({
  onFile,
  scanning,
  disabled = false,
  result,
  onClear,
}: ScanImagePanelProps) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = scanning || disabled;

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const pick = (file: File | undefined) => {
    if (!file || busy) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  };

  const clear = () => {
    setPreview(null);
    onClear?.();
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <section
      aria-label="Đọc ảnh bằng AI"
      className="mb-4 rounded-md border border-line bg-card"
      onDragOver={(e) => {
        if (busy) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
      }}
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2 text-[13px] font-semibold text-main">
        <Sparkles size={14} className="text-primary" />
        Đọc ảnh bằng AI
        <span className="ml-auto text-[12px] font-normal text-muted">
          Hoá đơn · Ảnh chuyển khoản
        </span>
      </header>

      <div className="p-3">
        <div
          className={cx(
            'flex items-center gap-3 rounded-sm border border-dashed px-3 py-3 transition-colors duration-100',
            dragging ? 'border-primary bg-hover' : 'border-line-hover'
          )}
        >
          {preview ? (
            <img
              src={preview}
              alt="Ảnh đã chọn"
              className="size-14 shrink-0 rounded-xs border border-line object-cover"
            />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xs bg-input text-muted light:bg-hover">
              <Image size={20} />
            </span>
          )}

          <div className="min-w-0 flex-1 text-[13px]">
            {scanning ? (
              <p className="flex items-center gap-2 text-main" role="status">
                <Loader2 size={14} className="animate-spin text-primary" />
                AI đang đọc ảnh...
              </p>
            ) : result ? (
              <p className="flex items-center gap-1.5 text-main">
                <Check size={14} className="text-income" />
                Đã điền form · độ tin cậy {confidencePct}%
              </p>
            ) : (
              <p className="text-main">Tải ảnh lên để tự điền giao dịch</p>
            )}
            <p className="mt-0.5 text-muted">
              Kéo thả, dán (Ctrl+V) hoặc chọn ảnh JPEG, PNG, WebP · tối đa 10MB
            </p>
          </div>

          {preview && !scanning && (
            <button
              type="button"
              onClick={clear}
              aria-label="Bỏ ảnh"
              title="Bỏ ảnh"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent text-muted hover:bg-hover hover:text-main"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {result?.notes && (
          <p className="mt-2 rounded-sm bg-input px-3 py-2 text-[12px] text-muted light:bg-hover">
            {result.notes}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => libraryRef.current?.click()}
            className={cx(BTN_SECONDARY, 'mobile:grow mobile:basis-[0%]')}
          >
            <Upload size={14} /> Chọn ảnh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className={cx(BTN_SECONDARY, 'mobile:grow mobile:basis-[0%]')}
          >
            Chụp hoá đơn
          </button>
        </div>

        {/* Library picker: no `capture`, so phones offer Photos / Files (screenshots live there). */}
        <input
          ref={libraryRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
