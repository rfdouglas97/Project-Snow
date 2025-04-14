
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TryOnGenerationProps {
  userAvatar: string | null;
  productImageUrl: string;
  productName: string;
}

interface GenerationOptions {
  model?: 'gemini' | 'openai';
}

export function useTryOnGeneration({ userAvatar, productImageUrl, productName }: TryOnGenerationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const { toast } = useToast();

  const generateTryOn = async (options: GenerationOptions = { model: 'gemini' }) => {
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

      // Call the edge function to generate the try-on image
      const { data, error } = await supabase.functions.invoke('generate-try-on', {
        body: { 
          avatarUrl: userAvatar,
          productImageUrl: productImageUrl,
          userId: user.id,
          model: options.model  // Pass the model preference to the edge function
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Failed to call generation service: ${error.message}`);
      }

      if (data.error) {
        console.error("Generation error:", data.error);
        throw new Error(data.error);
      }

      // Set the try-on image URL
      setTryOnImage(data.tryOnImageUrl);
      
      // If the response indicates it's a placeholder, show a different message
      if (data.isPlaceholder) {
        toast({
          title: "AI generation unavailable",
          description: "Using your avatar as a placeholder. Please try again later.",
          variant: "destructive", // Changed from "warning" to "destructive" to fix the type error
        });
      } else {
        toast({
          title: "Try-on complete",
          description: "Your virtual fitting is ready to view",
        });
      }
      
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
