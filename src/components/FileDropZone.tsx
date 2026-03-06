import { useState, useRef, useCallback, DragEvent } from 'react';
import { Upload, Paperclip, X, FileIcon, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileAttachment } from '@/types/project';

interface FileDropZoneProps {
  onFilesAdded: (files: FileAttachment[]) => void;
  compact?: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf')) return FileText;
  return FileIcon;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropZone({ onFilesAdded, compact, disabled }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    if (disabled) return;
    const files = Array.from(fileList);
    const attachments: FileAttachment[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" exceeds 5MB limit.`);
        continue;
      }

      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      attachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        data,
        addedAt: new Date().toISOString(),
      });
    }

    if (attachments.length > 0) onFilesAdded(attachments);
  }, [onFilesAdded, disabled]);

  const handleDragOver = (e: DragEvent) => { 
    if (disabled) return;
    e.preventDefault(); 
    setDragging(true); 
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          title="Attach file"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
      </>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed border-muted' : 'cursor-pointer ' + (dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')
      }`}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={e => e.target.files && processFiles(e.target.files)}
      />
      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-primary">Click to upload</span> or drag & drop
      </p>
      <p className="text-xs text-muted-foreground mt-1">Max 5MB per file</p>
    </div>
  );
}

interface AttachmentListProps {
  attachments: FileAttachment[];
  onRemove?: (id: string) => void;
  readonly?: boolean;
}

export function AttachmentList({ attachments, onRemove, readonly }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  const openFile = (att: FileAttachment) => {
    const w = window.open();
    if (w) {
      if (att.type.startsWith('image/')) {
        w.document.write(`<img src="${att.data}" alt="${att.name}" style="max-width:100%"/>`);
      } else {
        w.document.write(`<iframe src="${att.data}" style="width:100%;height:100%;border:none"></iframe>`);
      }
      w.document.title = att.name;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map(att => {
        const Icon = getFileIcon(att.type);
        return (
          <div
            key={att.id}
            className="flex items-center gap-1.5 bg-secondary rounded-md px-2 py-1 text-xs group cursor-pointer hover:bg-accent transition-colors"
            onClick={() => openFile(att)}
            title={`${att.name} (${formatSize(att.size)})`}
          >
            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[120px]">{att.name}</span>
            <span className="text-muted-foreground">{formatSize(att.size)}</span>
            {!readonly && onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(att.id); }}
                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
