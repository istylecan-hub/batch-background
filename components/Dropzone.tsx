import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  className?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Prevent flickering when dragging over child elements
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
    }
    // Reset input value to allow selecting the same file again if needed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
        isDragging 
          ? "border-primary bg-primary/10 scale-[1.01]" 
          : "border-neutral-700 hover:border-neutral-500 hover:bg-surfaceHighlight",
        className
      )}
    >
      <input
        type="file"
        ref={inputRef}
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mb-4 text-primary">
        <UploadCloud size={32} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Upload Product Images</h3>
      <p className="text-sm text-neutral-400 text-center max-w-sm">
        Drag & drop or click to browse. Supports JPG, PNG, WEBP up to 8K. Batch support enabled.
      </p>
      <div className="mt-4 flex gap-2">
        <span className="text-xs bg-surface border border-neutral-700 px-2 py-1 rounded text-neutral-400">
            Max 50 files
        </span>
        <span className="text-xs bg-surface border border-neutral-700 px-2 py-1 rounded text-neutral-400">
            Auto-Segmentation
        </span>
      </div>
    </div>
  );
};