
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { TryOnButton } from "./TryOnButton";
import { TryOnCard } from "./TryOnCard";
import { useAvatarFetching } from "./useAvatarFetching";
import { useTryOnGeneration } from "./useTryOnGeneration";

interface ProductTryOnProps {
  productId: string;
  productName: string;
  productImageUrl: string;
  price: string;
}

export function ProductTryOn({
  productId,
  productName,
  productImageUrl,
  price
}: ProductTryOnProps) {
  const { toast } = useToast();
  const [showTryOn, setShowTryOn] = useState(false);
  
  const { userAvatar, fetchUserAvatar, isLoading: isAvatarLoading } = useAvatarFetching();
  
  // Pre-fetch avatar on component mount
  useEffect(() => {
    // Only try to fetch avatar once on component mount
    if (!userAvatar) {
      fetchUserAvatar().then(success => {
        if (success) {
          console.log("Avatar pre-fetched successfully");
        }
      });
    }
  }, []);
  
  const { 
    isLoading, 
    tryOnImage, 
    generateTryOn, 
    setTryOnImage 
  } = useTryOnGeneration({
    userAvatar,
    productImageUrl,
    productName
  });

  const handleTryOn = async () => {
    // If we don't have the avatar yet, try to fetch it
    if (!userAvatar) {
      const hasAvatar = await fetchUserAvatar();
      if (!hasAvatar) return;
    }

    setShowTryOn(true);
    generateTryOn();
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

  const handleRegenerate = () => {
    setTryOnImage(null);
    generateTryOn();
  };

  const handleClose = () => {
    setShowTryOn(false);
    setTryOnImage(null);
  };

  return (
    <div className="relative">
      {!showTryOn ? (
        <TryOnButton onClick={handleTryOn} isLoading={isAvatarLoading} />
      ) : (
        <TryOnCard
          productName={productName}
          isLoading={isLoading}
          tryOnImage={tryOnImage}
          onClose={handleClose}
          onSave={handleSave}
          onShare={handleShare}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
}
