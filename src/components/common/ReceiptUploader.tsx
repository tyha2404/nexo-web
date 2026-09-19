import React, { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ReceiptUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chỉ chọn tệp hình ảnh (JPEG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước ảnh tối đa 10MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || 'public';
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(data.path);

      onChange(publicData.publicUrl);
    } catch (err: any) {
      console.error('Error uploading receipt:', err);
      setError(err.message || 'Tải ảnh hóa đơn thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div className="w-full">
      <label
        style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-main)',
          marginBottom: '0.5rem',
        }}
      >
        Hóa đơn / Chứng từ đính kèm
      </label>

      {value ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '140px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <img
            src={value}
            alt="Receipt preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: '0.5rem',
            }}
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                padding: '0.35rem',
                background: 'rgba(244, 63, 94, 0.9)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Xóa ảnh"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          style={{
            width: '100%',
            minHeight: '96px',
            border: '1.5px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            background: disabled || uploading ? 'var(--bg-hover)' : 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !uploading) {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.boxShadow = '0 0 12px var(--primary-glow)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !uploading) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {uploading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--primary)',
              }}
            >
              <Loader2 className="animate-spin" size={22} />
              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                Đang tải ảnh lên máy chủ...
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <Upload size={16} />
              </div>
              <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-main)' }}>
                Bấm để tải ảnh hóa đơn / chứng từ
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Hỗ trợ PNG, JPEG, WEBP (tối đa 10MB)
              </span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
        </div>
      )}

      {error && (
        <p
          style={{
            marginTop: '0.35rem',
            fontSize: '0.75rem',
            color: 'var(--expense)',
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};
