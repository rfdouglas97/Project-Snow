
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Save, Share, RefreshCcw } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface TryOnPopupScreenProps {
  productName?: string;
  productImageUrl?: string;
  open: boolean;
  onClose: () => void;
}

export const TryOnPopupScreen: React.FC<TryOnPopupScreenProps> = ({
  productName = "Striped Shirt",
  productImageUrl = "https://80abf56c-759b-449a-9d84-dc9ecb2b2969.lovableproject.com/lovable-uploads/b6bfa933-c408-42a4-a596-9b701e86dfa3.png",
  open,
  onClose
}) => {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [tryOnImage, setTryOnImage] = React.useState<string | null>(null);

  // Fetch user's avatar path from Supabase Storage
  const fetchUserAvatar = async () => {
    if (!user) return null;
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('avatars')
      .list(`user-${user.id}`, {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    if (storageError || !storageData || storageData.length === 0) return null;
    // Get public URL of the avatar
    const avatarPath = storageData[0].name;
    return supabase.storage
      .from('avatars')
      .getPublicUrl(`user-${user.id}/${avatarPath}`).data.publicUrl;
  };

  // Generate Try-On function
  const generateTryOn = async () => {
    if (!user) {
      toast({ title: "Login required", description: "Please sign in.", variant: "destructive" });
      return;
    }

    const userAvatar = await fetchUserAvatar();
    if (!userAvatar) {
      toast({ title: "Avatar not found", description: "Please create an avatar first.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTryOnImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-try-on', {
        body: {
          avatarUrl: userAvatar,
          productImageUrl,
          userId: user.id
        },
      });
      if (error) throw error;
      setTryOnImage(data.tryOnImageUrl);
      toast({ title: "Try-on complete", description: "Ready to view!" });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating your try-on image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger generation when opened
  useEffect(() => {
    if (open) {
      setTryOnImage(null);
      generateTryOn();
    }
    // eslint-disable-next-line
  }, [open]);

  // Modified Save image handler to download directly without navigation
  const handleSave = () => {
    if (tryOnImage) {
      // Create a temporary anchor element to trigger the download
      const link = document.createElement("a");
      
      // Fetch the image first to ensure we're handling it as a blob
      fetch(tryOnImage)
        .then(response => response.blob())
        .then(blob => {
          // Create an object URL for the blob
          const objectURL = window.URL.createObjectURL(blob);
          
          // Set up the download
          link.href = objectURL;
          link.download = `try-on-${productName.replace(/\s/g, "-")}.png`;
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          window.URL.revokeObjectURL(objectURL);
          
          toast({ title: "Image saved", description: "Saved to your device." });
        })
        .catch(error => {
          console.error("Error downloading image:", error);
          toast({ 
            title: "Download failed", 
            description: "Could not download the image.",
            variant: "destructive"
          });
        });
    }
  };

  // Share image handler
  const handleShare = () => {
    if (tryOnImage && navigator.share) {
      navigator.share({
        title: `Try-on for ${productName}`,
        text: `Check out how I look in this ${productName}!`,
        url: tryOnImage,
      })
      .then(() => {
        toast({ title: "Shared", description: "Your image has been shared" });
      })
      .catch(() => {
        toast({ title: "Sharing failed", variant: "destructive" });
      });
    } else if (tryOnImage) {
      navigator.clipboard.writeText(tryOnImage);
      toast({ title: "Link copied", description: "Image link copied to clipboard" });
    }
  };

  // Regenerate
  const handleRegenerate = () => {
    setTryOnImage(null);
    generateTryOn();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg w-[95vw] max-w-md mx-auto flex flex-col items-center p-0 pt-2 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
        {/* Updated logo path */}
        <div className="w-full flex items-center justify-start pl-5 pt-4 pb-3">
          <img
            src="/lovable-uploads/aa9a914e-077a-4c57-b8f4-a66c0d337df2.png"
            alt="Mira logo"
            className="w-28 h-auto"
          />
        </div>
        <Card className="w-[92vw] max-w-[370px] mx-auto mb-2 shadow-lg border" style={{ borderRadius: "16px" }}>
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-[1.2rem] font-bold text-mira-text">Virtual Try-On</CardTitle>
            <CardDescription className="text-mira-text/80 text-sm px-1 pb-2 pt-1">
              See how {productName} looks on you
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-2 pb-2 flex flex-col items-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-2 py-7 w-full">
                <Skeleton className="w-full h-[290px] rounded-lg" />
                <span className="text-center text-mira-purple font-medium mt-3">Generating your try-on...</span>
                <span className="text-xs text-muted-foreground">This may take up to 30 seconds</span>
              </div>
            )}
            {!isLoading && tryOnImage && (
              <img
                src={tryOnImage}
                alt={`Try on: ${productName}`}
                className="w-full h-auto object-contain rounded-md bg-white border max-h-[290px]"
                style={{ background: "#fff" }}
              />
            )}
            {!isLoading && !tryOnImage && (
              <Skeleton className="w-full h-[290px] rounded-lg" />
            )}
          </CardContent>
          <CardFooter className="flex justify-between items-center px-6 pb-5 pt-2">
            {/* Styled Buttons - Save, Share, Regenerate */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isLoading || !tryOnImage}
                className="border-mira-purple/50 text-mira-purple hover:bg-mira-purple/20 px-3"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={isLoading || !tryOnImage}
                className="border-mira-purple/50 text-mira-purple hover:bg-mira-purple/20 px-3"
              >
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={isLoading}
              className="bg-gradient-to-r from-mira-purple to-mira-pink text-white font-semibold px-4 shadow-md hover:opacity-90"
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Regenerate
            </Button>
          </CardFooter>
        </Card>
        <div className="pb-3 pt-2 text-sm text-gray-600 font-medium text-center w-full">Close Window</div>
      </div>
    </div>
  );
};
