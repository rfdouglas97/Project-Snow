
import { Save, Share2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TryOnActionsProps {
  onSave: () => void;
  onShare: () => void;
  onRegenerate?: () => void;
  disabled: boolean;
}

export function TryOnActions({ onSave, onShare, onRegenerate, disabled }: TryOnActionsProps) {
  return (
    <div className="flex justify-between pt-2">
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSave}
          disabled={disabled}
          className="border-mira-purple/30 text-mira-purple hover:bg-mira-purple/10"
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onShare}
          disabled={disabled}
          className="border-mira-purple/30 text-mira-purple hover:bg-mira-purple/10"
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </div>
      {onRegenerate && (
        <Button 
          size="sm"
          onClick={onRegenerate}
          disabled={disabled}
          className="bg-gradient-primary hover:shadow-md transition-shadow duration-300"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate
        </Button>
      )}
    </div>
  );
}
