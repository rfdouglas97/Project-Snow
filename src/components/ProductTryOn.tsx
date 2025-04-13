import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Image, Loader2, ShoppingCart, Save, Share2, X } from "lucide-react";

interface ProductTryOnProps {
  productId: string;
  productName: string;
  productImageUrl: string;
  price: string;
  onAddToCart?: () => void;
}

export function ProductTryOn({
  productId,
  productName,
  productImageUrl,
  price,
  onAddToCart
}: ProductTryOnProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showTryOn, setShowTryOn] = useState(false);

  // Fetch user's avatar when component mounts or when try-on is clicked
  const fetchUserAvatar = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the try-on feature",
          variant: "destructive",
        });
        return false;
      }

      // Get user's latest avatar from storage directly
      // Since we don't have a user_avatars table properly defined in types,
      // we'll get avatars from storage instead
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('avatars')
        .list(`user-${user.id}`, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (storageError || !storageData || storageData.length === 0) {
        toast({
          title: "No avatar found",
          description: "Please create an avatar first in the Avatar Generator",
          variant: "destructive",
        });
        return false;
      }

      // Get public URL of the avatar
      const avatarPath = storageData[0].name;
      const avatarUrl = supabase.storage
        .from('avatars')
        .getPublicUrl(`user-${user.id}/${avatarPath}`).data.publicUrl;

      setUserAvatar(avatarUrl);
      return true;
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      toast({
        title: "Error fetching avatar",
        description: "Could not retrieve your avatar image",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleTryOn = async () => {
    // First check if we already have the user avatar, if not fetch it
    if (!userAvatar) {
      const hasAvatar = await fetchUserAvatar();
      if (!hasAvatar) return;
    }

    setIsLoading(true);
    setShowTryOn(true);
    
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
    } catch (error) {
      console.error("Error during try-on generation:", error);
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating your try-on image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (tryOnImage) {
      // Create an anchor element and trigger download
      const link = document.createElement('a');
      link.href = tryOnImage;
      link.download = `try-on-${productId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Image saved",
        description: "Your try-on image has been saved",
      });
    }
  };

  const handleShare = () => {
    if (tryOnImage && navigator.share) {
      navigator.share({
        title: `Try-on for ${productName}`,
        text: `Check out how I look in this ${productName}!`,
        url: tryOnImage,
      })
      .then(() => {
        toast({
          title: "Shared successfully",
          description: "Your image has been shared",
        });
      })
      .catch((error) => {
        console.error("Error sharing:", error);
        toast({
          title: "Sharing failed",
          description: "Could not share your image",
          variant: "destructive",
        });
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(tryOnImage || "");
      toast({
        title: "Link copied",
        description: "Image link copied to clipboard",
      });
    }
  };

  const handleClose = () => {
    setShowTryOn(false);
    setTryOnImage(null);
  };

  return (
    <div className="relative">
      {!showTryOn ? (
        <Button 
          onClick={handleTryOn} 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 mt-2"
        >
          <Image className="h-4 w-4" />
          Try it on with Mira
        </Button>
      ) : (
        <Card className="w-full shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Virtual Try-On</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              See how {productName} looks on you
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-center">Generating your try-on...</p>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    This may take a few moments
                  </p>
                </div>
              </div>
            ) : tryOnImage ? (
              <div className="overflow-hidden rounded-md">
                <img 
                  src={tryOnImage} 
                  alt={`You wearing ${productName}`} 
                  className="w-full h-auto object-cover rounded-md"
                />
              </div>
            ) : (
              <Skeleton className="w-full h-[300px] rounded-md" />
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSave}
                disabled={!tryOnImage || isLoading}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleShare}
                disabled={!tryOnImage || isLoading}
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
            <Button 
              size="sm"
              onClick={onAddToCart}
              disabled={isLoading}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add to Cart
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
