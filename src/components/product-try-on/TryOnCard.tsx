
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TryOnLoading } from "./TryOnLoading";
import { TryOnImage } from "./TryOnImage";
import { TryOnActions } from "./TryOnActions";
import { Badge } from "@/components/ui/badge";

interface TryOnCardProps {
  productName: string;
  isLoading: boolean;
  tryOnImage: string | null;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
  onRegenerate?: () => void;
  modelName?: string;
}

export function TryOnCard({
  productName,
  isLoading,
  tryOnImage,
  onClose,
  onSave,
  onShare,
  onRegenerate,
  modelName = "AI"
}: TryOnCardProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Virtual Try-On</CardTitle>
            {modelName && (
              <Badge variant="outline" className="text-xs">
                {modelName}
              </Badge>
            )}
          </div>
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
          <TryOnLoading modelName={modelName} />
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
          onRegenerate={onRegenerate}
          disabled={!tryOnImage || isLoading}
        />
      </CardFooter>
    </Card>
  );
}
