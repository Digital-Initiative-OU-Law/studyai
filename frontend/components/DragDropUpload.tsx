'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface DragDropUploadProps {
  weekId: number;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
}

export default function DragDropUpload({ weekId, onUploadComplete }: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map());

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf'
      );
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const updatedFiles = new Map(files);
    newFiles.forEach(file => {
      updatedFiles.set(file.name, {
        file,
        status: 'pending',
        progress: 0,
      });
    });
    setFiles(updatedFiles);
    
    // Auto-start upload for each file
    newFiles.forEach(file => uploadFile(file));
  };

  const uploadFile = async (file: File) => {
    const fileName = file.name;
    
    // Update status to uploading
    setFiles(prev => {
      const updated = new Map(prev);
      const current = updated.get(fileName);
      if (current) {
        current.status = 'uploading';
        current.progress = 0;
      }
      return updated;
    });

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setFiles(prev => {
        const updated = new Map(prev);
        const current = updated.get(fileName);
        if (current && current.progress < 90) {
          current.progress += 10;
        }
        return updated;
      });
    }, 200);

    try {
      // Mock API call - replace with actual upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      
      // Update to processing
      setFiles(prev => {
        const updated = new Map(prev);
        const current = updated.get(fileName);
        if (current) {
          current.status = 'processing';
          current.progress = 100;
        }
        return updated;
      });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mark as done
      setFiles(prev => {
        const updated = new Map(prev);
        const current = updated.get(fileName);
        if (current) {
          current.status = 'done';
        }
        return updated;
      });

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      clearInterval(progressInterval);
      setFiles(prev => {
        const updated = new Map(prev);
        const current = updated.get(fileName);
        if (current) {
          current.status = 'error';
          current.error = 'Upload failed';
        }
        return updated;
      });
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => {
      const updated = new Map(prev);
      updated.delete(fileName);
      return updated;
    });
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin text-ou-crimson" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />;
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-ou-cream/50" />;
    }
  };

  const getStatusText = (status: UploadFile['status'], progress: number) => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'processing':
        return 'Processing: Extracting → Chunking → Embedding → Indexing';
      case 'done':
        return 'Complete';
      case 'error':
        return 'Failed';
      default:
        return 'Waiting...';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-all
            ${isDragging 
              ? 'border-ou-crimson bg-ou-crimson/10' 
              : 'border-ou-panel hover:border-ou-crimson/50'
            }
          `}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-ou-cream/50" />
          <h3 className="text-lg font-semibold mb-2">
            Upload PDF Materials for Week {weekId}
          </h3>
          <p className="text-sm text-ou-cream/70 mb-4">
            Drag and drop PDF files here, or click to browse
          </p>
          
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer">
              Select PDFs
            </Button>
          </label>
        </div>

        {files.size > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold">Upload Queue</h4>
            {Array.from(files.entries()).map(([fileName, fileInfo]) => (
              <div
                key={fileName}
                className="flex items-center justify-between p-3 bg-ou-panel rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(fileInfo.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{fileName}</p>
                    <p className="text-xs text-ou-cream/60">
                      {getStatusText(fileInfo.status, fileInfo.progress)}
                    </p>
                    {fileInfo.status === 'uploading' && (
                      <div className="mt-1 h-1 bg-ou-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ou-crimson transition-all"
                          style={{ width: `${fileInfo.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {(fileInfo.status === 'done' || fileInfo.status === 'error') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileName)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}