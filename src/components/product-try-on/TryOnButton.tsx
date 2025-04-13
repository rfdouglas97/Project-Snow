
import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TryOnButtonProps {
  onClick: () => void;
}

export function TryOnButton({ onClick }: TryOnButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      variant="outline" 
      className="w-full flex items-center justify-center gap-2 mt-2"
    >
      <Image className="h-4 w-4" />
      Try it on with Mira
    </Button>
  );
}
