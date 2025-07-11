
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TryOnGenerationProps {
  userAvatar: string | null;
  productImageUrl: string;
  productName: string;
}

export function useTryOnGeneration({ userAvatar, productImageUrl, productName }: TryOnGenerationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const { toast } = useToast();

  const generateTryOn = async () => {
    if (!userAvatar) {
      toast({
        title: "Avatar required",
        description: "Please create an avatar first",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check if productImageUrl is a relative path and convert to absolute URL if needed
      let fullProductImageUrl = productImageUrl;
      if (productImageUrl.startsWith('/')) {
        // Convert relative URL to absolute
        fullProductImageUrl = `${window.location.origin}${productImageUrl}`;
        console.log("Converting relative URL to absolute:", fullProductImageUrl);
      }

      // Call the edge function to generate the try-on image
      const { data, error } = await supabase.functions.invoke('generate-try-on', {
        body: { 
          avatarUrl: userAvatar,
          productImageUrl: fullProductImageUrl,
          userId: user.id
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Failed to call generation service: ${error.message}`);
      }

      if (data.error) {
        console.error("Generation error:", data.error);
        // Check if the error message indicates a bucket not found issue
        if (data.error.includes("bucket not found") || data.error.includes("not found")) {
          throw new Error("Storage buckets not found. Please create an avatar first in the Avatar Generator.");
        }
        throw new Error(data.error);
      }

      // Set the try-on image URL
      setTryOnImage(data.tryOnImageUrl);
      
      toast({
        title: "Try-on complete",
        description: "Your virtual fitting is ready to view",
      });
      
      return true;
    } catch (error) {
      console.error("Error during try-on generation:", error);
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating your try-on image",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    tryOnImage,
    generateTryOn,
    setTryOnImage
  };
}
