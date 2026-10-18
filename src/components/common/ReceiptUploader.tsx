import moment from 'moment';
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../services';
import { getErrorMessage } from '../../commons/utils';

interface ReceiptUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  value,
  onChange,
  disabled = false,
  onUploadingChange,
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
    onUploadingChange?.(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || 'public';
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${moment().valueOf()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

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
    } catch (err) {
      console.error('Error uploading receipt:', err);
      setError(getErrorMessage(err, 'Tải ảnh hóa đơn thất bại'));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
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
      <label className="mb-2! block! text-[0.875rem]! font-medium! text-main!">
        Hóa đơn / Chứng từ đính kèm
      </label>

      {value ? (
        <div className="relative flex h-[140px] w-full items-center justify-center overflow-hidden rounded-md border border-line bg-card shadow-app-sm">
          <img src={value} alt="Receipt preview" className="size-full object-contain p-2" />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 inline-flex cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(244,63,94,0.9)] p-[0.35rem] text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-all duration-150 ease-[ease] hover:scale-[1.08]"
              title="Xóa ảnh"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`flex min-h-24 w-full flex-col items-center justify-center rounded-md border-[1.5px] border-dashed border-line p-4 text-muted transition-all duration-200 ease-[ease] ${
            disabled || uploading
              ? 'cursor-not-allowed bg-hover'
              : 'cursor-pointer bg-card hover:border-primary hover:bg-hover hover:shadow-[0_0_12px_var(--primary-glow)]'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-primary">
              <Loader2 className="animate-spin" size={22} />
              <span className="text-[0.8rem] font-medium">Đang tải ảnh lên máy chủ...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-[0.4rem]">
              <div className="flex size-8 items-center justify-center rounded-sm bg-hover text-primary">
                <Upload size={16} />
              </div>
              <span className="text-[0.825rem] font-medium text-main">
                Bấm để tải ảnh hóa đơn / chứng từ
              </span>
              <span className="text-[0.75rem] text-muted">
                Hỗ trợ PNG, JPEG, WEBP (tối đa 10MB)
              </span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
        </div>
      )}

      {error && <p className="mt-[0.35rem] text-[0.75rem] font-medium text-expense">{error}</p>}
    </div>
  );
};
