
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";

interface GeneratedAvatarProps {
  isCompleted: boolean;
  generatedAvatarUrl: string | null;
  onReset: () => void;
}

export function GeneratedAvatar({ 
  isCompleted, 
  generatedAvatarUrl, 
  onReset 
}: GeneratedAvatarProps) {
  if (!isCompleted) return null;
  
  return (
    <div className="space-y-4">
      <div className="text-center font-medium">Your Standardized Avatar</div>
      <div className="flex justify-center">
        {generatedAvatarUrl ? (
          <Avatar className="h-40 w-40">
            <AvatarImage src={generatedAvatarUrl} alt="Generated Avatar" />
            <AvatarFallback>
              <Skeleton className="h-40 w-40 rounded-full" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Skeleton className="h-40 w-40 rounded-full" />
        )}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Your avatar has been standardized with plain white clothing and a neutral background
      </div>
      <div className="w-full flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button className="flex-1 gap-2">
          <Check className="h-4 w-4" />
          Save Avatar
        </Button>
      </div>
    </div>
  );
}
