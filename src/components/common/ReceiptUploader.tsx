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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Hóa đơn / Chứng từ đính kèm
      </label>

      {value ? (
        <div className="relative group w-full h-36 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          <img src={value} alt="Receipt preview" className="w-full h-full object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition-all opacity-90 hover:opacity-100"
              title="Xóa ảnh"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
            disabled || uploading
              ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed'
              : 'border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gray-50 dark:bg-gray-800/40 hover:bg-indigo-50/20'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Đang tải ảnh lên Supabase...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-medium">Bấm để tải ảnh hóa đơn (tối đa 10MB)</span>
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

      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
};
