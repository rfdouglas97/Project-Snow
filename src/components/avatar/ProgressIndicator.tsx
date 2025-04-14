
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProgressIndicatorProps {
  isUploading: boolean;
  uploadProgress: number;
  isGenerating: boolean;
  isResizing?: boolean;
  error?: string | null;
}

export function ProgressIndicator({ 
  isUploading, 
  uploadProgress, 
  isGenerating,
  isResizing,
  error 
}: ProgressIndicatorProps) {
  if (!isUploading && !isGenerating && !isResizing && !error) return null;
  
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Uploading...</span>
            <span className="text-sm">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {isResizing && (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-center">Resizing image to meet AI requirements...</p>
          <p className="text-xs text-center text-muted-foreground mt-1">This may take a few seconds</p>
        </div>
      )}
      
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-center">GPT-4o is analyzing your photo and creating a standardized avatar...</p>
          <p className="text-xs text-center text-muted-foreground mt-1">This may take up to 30 seconds</p>
        </div>
      )}
    </div>
  );
}
