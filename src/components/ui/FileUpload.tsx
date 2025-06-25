import React, { useRef, useState } from 'react';
import { Upload, X, Check, FileText } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  helperText?: string;
  error?: string;
  accept?: string;
  maxSize?: number; // in bytes
  onChange: (file: File | null) => void;
  value?: File | null;
  id?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  helperText,
  error,
  accept,
  maxSize = 2 * 1024 * 1024, // 2MB default
  onChange,
  value,
  id,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(error);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      setLocalError(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
      return false;
    }

    // Check file type if accept is specified
    if (accept) {
      const acceptTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      const fileExtension = `.${file.name.split('.').pop()}`;
      
      const isValidType = acceptTypes.some(type => {
        if (type.startsWith('.')) {
          // Extension check
          return fileExtension.toLowerCase() === type.toLowerCase();
        } else if (type.includes('/*')) {
          // MIME type wildcard
          const mimeGroup = type.split('/')[0];
          return fileType.startsWith(`${mimeGroup}/`);
        } else {
          // Exact MIME type
          return fileType === type;
        }
      });

      if (!isValidType) {
        setLocalError(`Invalid file type. Accepted types: ${accept}`);
        return false;
      }
    }

    setLocalError(undefined);
    return true;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onChange(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onChange(file);
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}
      
      {!value ? (
        <div
          className={`
            border-2 border-dashed rounded-md p-6
            ${dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600'}
            ${localError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
            transition-colors duration-200
            flex flex-col items-center justify-center
            cursor-pointer
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {accept ? `Accepted formats: ${accept}` : 'All file types accepted'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Max size: {formatFileSize(maxSize)}
          </p>
        </div>
      ) : (
        <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-blue-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {value.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(value.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
      
      {(helperText || localError) && (
        <p className={`mt-1 text-sm ${localError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {localError || helperText}
        </p>
      )}
    </div>
  );
};

export default FileUpload;