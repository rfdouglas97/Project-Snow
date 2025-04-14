
import { Loader2 } from "lucide-react";

interface TryOnLoadingProps {
  modelName?: string;
}

export function TryOnLoading({ modelName = "AI" }: TryOnLoadingProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-sm text-center">Generating your try-on...</p>
        <p className="text-xs text-center text-muted-foreground mt-1">
          {modelName} is creating your virtual fitting
        </p>
      </div>
    </div>
  );
}
