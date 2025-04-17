
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

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
  const { toast } = useToast();
  const [isSaving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Add cache-busting parameter to the image URL
  useEffect(() => {
    if (generatedAvatarUrl) {
      const cacheBuster = `?t=${Date.now()}`;
      const urlWithCacheBuster = generatedAvatarUrl.includes('?') 
        ? `${generatedAvatarUrl}&cb=${Date.now()}` 
        : `${generatedAvatarUrl}${cacheBuster}`;
      setImageUrl(urlWithCacheBuster);
    } else {
      setImageUrl(null);
    }
  }, [generatedAvatarUrl]);
  
  if (!isCompleted) return null;
  
  // Since the avatar is already saved during generation in the edge function,
  // the save button is redundant. We're removing the handleSaveAvatar function 
  // and simplifying the UI to just show the generated image with a "Try Again" button.
  
  return (
    <div className="space-y-4">
      <div className="text-center font-medium">Your Full-Body Avatar</div>
      <div className="flex justify-center">
        {imageUrl ? (
          <div className="h-96 w-full max-w-md rounded-md overflow-hidden border">
            <img 
              src={imageUrl} 
              alt="Generated Avatar" 
              className="object-contain w-full h-full"
              loading="eager"
            />
          </div>
        ) : (
          <Skeleton className="h-96 w-full max-w-md rounded-md" />
        )}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Your full-body avatar has been generated with neutral-colored clothing and background
      </div>
      <div className="w-full flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button 
          className="flex-1 gap-2"
          disabled={true}
        >
          <Check className="h-4 w-4" />
          Avatar Saved
        </Button>
      </div>
    </div>
  );
}
