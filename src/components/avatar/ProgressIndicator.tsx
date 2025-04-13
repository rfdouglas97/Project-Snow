
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressIndicatorProps {
  isUploading: boolean;
  uploadProgress: number;
  isGenerating: boolean;
}

export function ProgressIndicator({ 
  isUploading, 
  uploadProgress, 
  isGenerating 
}: ProgressIndicatorProps) {
  if (!isUploading && !isGenerating) return null;
  
  return (
    <div className="space-y-4">
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Uploading...</span>
            <span className="text-sm">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-center">DALL-E is creating your standardized avatar...</p>
          <p className="text-xs text-center text-muted-foreground mt-1">This may take up to 30 seconds</p>
        </div>
      )}
    </div>
  );
}
