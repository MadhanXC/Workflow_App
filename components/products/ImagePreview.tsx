"use client";

import { useState } from "react";
import { X, FileText, Download } from "lucide-react";
import { ProductImage } from "@/types/product";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  existingImages: string[];
  newImages: ProductImage[];
  onRemove?: (index: number, isExisting: boolean) => void;
  onDownload?: (url: string) => void;
  readonly?: boolean;
  disabled?: boolean;
  maxImages?: number;
}

function getFileNameFromUrl(url: string): string {
  try {
    // Get the last part of the path (after the last slash)
    const fullPath = decodeURIComponent(url);
    const fileName = fullPath.split('/').pop() || '';
    
    // Remove any query parameters or firebase tokens
    return fileName.split('?')[0];
  } catch {
    return 'file';
  }
}

export function ImagePreview({ 
  existingImages, 
  newImages, 
  onRemove,
  onDownload,
  readonly,
  disabled,
  maxImages = 5 
}: ImagePreviewProps) {
  if (existingImages.length === 0 && newImages.length === 0) {
    return null;
  }

  const totalFiles = existingImages.length + newImages.length;

  const renderFile = (url: string | File, index: number, isExisting: boolean) => {
    // For new files, use the original filename
    const fileName = isExisting 
      ? getFileNameFromUrl(url as string)
      : (url as File).name;

    return (
      <div key={index} className="relative group">
        <div className="w-full h-24 bg-muted/50 rounded-lg flex flex-col items-center justify-center p-4 gap-2 border-2 border-muted hover:border-primary/20 transition-colors">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center truncate w-full">
            {fileName}
          </p>
        </div>
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDownload && isExisting && (
            <Button
              size="icon"
              variant="secondary"
              className="h-6 w-6"
              onClick={() => onDownload(url as string)}
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
          {!readonly && !disabled && onRemove && (
            <Button
              size="icon"
              variant="destructive"
              className="h-6 w-6"
              onClick={() => onRemove(index, isExisting)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {existingImages.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Existing Documents</h3>
            {!readonly && <span className="text-sm text-gray-500">
              {totalFiles}/{maxImages} files
            </span>}
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {existingImages.map((url, index) => renderFile(url, index, true))}
            </div>
          </ScrollArea>
        </div>
      )}

      {newImages.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">
              {readonly ? "New Documents" : `New Documents`}
            </h3>
            {!readonly && <span className="text-sm text-gray-500">
              {totalFiles}/{maxImages} files
            </span>}
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {newImages.map((image, index) => renderFile(image.file, index, false))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}