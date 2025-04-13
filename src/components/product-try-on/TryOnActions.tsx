
import { Save, Share2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TryOnActionsProps {
  onSave: () => void;
  onShare: () => void;
  onAddToCart: () => void;
  disabled: boolean;
}

export function TryOnActions({ onSave, onShare, onAddToCart, disabled }: TryOnActionsProps) {
  return (
    <div className="flex justify-between pt-2">
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSave}
          disabled={disabled}
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onShare}
          disabled={disabled}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </div>
      <Button 
        size="sm"
        onClick={onAddToCart}
        disabled={disabled}
      >
        <ShoppingCart className="h-4 w-4 mr-1" />
        Add to Cart
      </Button>
    </div>
  );
}
