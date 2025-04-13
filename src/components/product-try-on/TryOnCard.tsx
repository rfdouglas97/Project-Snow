
import { X } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TryOnImage } from "./TryOnImage";
import { TryOnLoading } from "./TryOnLoading";
import { TryOnActions } from "./TryOnActions";

interface TryOnCardProps {
  productName: string;
  isLoading: boolean;
  tryOnImage: string | null;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
  onAddToCart?: () => void;
}

export function TryOnCard({
  productName,
  isLoading,
  tryOnImage,
  onClose,
  onSave,
  onShare,
  onAddToCart = () => {}
}: TryOnCardProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Virtual Try-On</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          See how {productName} looks on you
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <TryOnLoading />
        ) : (
          <TryOnImage 
            imageUrl={tryOnImage} 
            productName={productName}
            isLoading={isLoading}
          />
        )}
      </CardContent>
      <CardFooter>
        <TryOnActions
          onSave={onSave}
          onShare={onShare}
          onAddToCart={onAddToCart}
          disabled={!tryOnImage || isLoading}
        />
      </CardFooter>
    </Card>
  );
}
