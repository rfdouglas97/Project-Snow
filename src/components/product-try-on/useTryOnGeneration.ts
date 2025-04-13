
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
      return false;
    }

    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the edge function to generate the try-on image
      const { data, error } = await supabase.functions.invoke('generate-try-on', {
        body: { 
          avatarUrl: userAvatar,
          productImageUrl: productImageUrl,
          userId: user.id
        }
      });

      if (error) {
        throw error;
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
