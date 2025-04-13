
import { Skeleton } from "@/components/ui/skeleton";

interface TryOnImageProps {
  imageUrl: string | null;
  productName: string;
  isLoading: boolean;
}

export function TryOnImage({ imageUrl, productName, isLoading }: TryOnImageProps) {
  if (isLoading) {
    return <Skeleton className="w-full h-[300px] rounded-md" />;
  }
  
  if (!imageUrl) {
    return <Skeleton className="w-full h-[300px] rounded-md" />;
  }
  
  return (
    <div className="overflow-hidden rounded-md">
      <img 
        src={imageUrl} 
        alt={`You wearing ${productName}`} 
        className="w-full h-auto object-cover rounded-md"
      />
    </div>
  );
}
