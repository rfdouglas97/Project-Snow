
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

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
  
  if (!isCompleted) return null;
  
  const handleSaveAvatar = async () => {
    if (!generatedAvatarUrl) {
      toast({
        title: "No avatar to save",
        description: "Please generate an avatar first",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save your avatar",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Avatar saved",
        description: "Your avatar is ready to use in the Try-On feature",
      });
      
      // The actual saving happens in the generate-avatar function when it creates
      // the avatar, so we don't need to do anything additional here
      
    } catch (error) {
      console.error("Error saving avatar:", error);
      toast({
        title: "Error saving avatar",
        description: "Could not save your avatar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="text-center font-medium">Your Full-Body Avatar</div>
      <div className="flex justify-center">
        {generatedAvatarUrl ? (
          <div className="h-96 w-full max-w-md rounded-md overflow-hidden border">
            <img 
              src={generatedAvatarUrl} 
              alt="Generated Avatar" 
              className="object-contain w-full h-full"
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
          onClick={handleSaveAvatar}
          disabled={isSaving || !generatedAvatarUrl}
        >
          <Check className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Avatar"}
        </Button>
      </div>
    </div>
  );
}
