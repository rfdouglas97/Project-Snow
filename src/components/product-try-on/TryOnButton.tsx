
import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TryOnButtonProps {
  onClick: () => void;
}

export function TryOnButton({ onClick }: TryOnButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      className="w-full flex items-center justify-center gap-2 mt-2 bg-gradient-primary hover:shadow-md transition-shadow duration-300"
    >
      <Image className="h-4 w-4" />
      Try on with Mira
    </Button>
  );
}
