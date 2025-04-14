
import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TryOnButtonProps {
  onClick: () => void;
  modelBadge?: boolean;
}

export function TryOnButton({ onClick, modelBadge = false }: TryOnButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      className="w-full flex items-center justify-center gap-2 bg-gradient-primary hover:shadow-md transition-shadow duration-300 py-6"
    >
      <Image className="h-5 w-5" />
      Try on with Mira
      {modelBadge && (
        <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
          Gemini
        </span>
      )}
    </Button>
  );
}
