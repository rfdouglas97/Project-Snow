
import { Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TryOnButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function TryOnButton({ onClick, isLoading = false }: TryOnButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      className="w-full flex items-center justify-center gap-2 bg-gradient-primary hover:shadow-md transition-shadow duration-300 py-6"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Image className="h-5 w-5" />
      )}
      Try on with Mira
    </Button>
  );
}
