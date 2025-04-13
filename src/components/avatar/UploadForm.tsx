
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

interface UploadFormProps {
  isUploading: boolean;
  isGenerating: boolean;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  file: File | null;
}

export function UploadForm({ 
  isUploading, 
  isGenerating, 
  onFileChange, 
  onUpload, 
  file 
}: UploadFormProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileChange(selectedFile);
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <label htmlFor="avatar-image" className="text-sm font-medium leading-none">
          Select Image
        </label>
        <Input
          id="avatar-image"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="cursor-pointer"
          disabled={isUploading || isGenerating}
        />
      </div>
      
      <Button
        onClick={onUpload}
        disabled={!file || isUploading || isGenerating}
        className="w-full flex items-center justify-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Create Standardized Avatar
      </Button>
    </div>
  );
}
