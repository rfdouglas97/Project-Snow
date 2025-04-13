
import { Skeleton } from "@/components/ui/skeleton";

interface ImagePreviewProps {
  previewUrl: string | null;
}

export function ImagePreview({ previewUrl }: ImagePreviewProps) {
  if (!previewUrl) return null;
  
  return (
    <div className="mt-4 relative">
      <div className="rounded-md overflow-hidden border w-full h-64 flex items-center justify-center">
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="object-contain max-h-full"
        />
      </div>
    </div>
  );
}
