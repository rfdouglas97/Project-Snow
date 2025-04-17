
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useAvatarFetching() {
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchUserAvatar = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the try-on feature",
          variant: "destructive",
        });
        return false;
      }

      // Check for avatars bucket
      try {
        // Check if buckets exist first
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error("Error checking buckets:", bucketsError);
          toast({
            title: "Storage error",
            description: "Could not access storage. Please try again later.",
            variant: "destructive",
          });
          return false;
        }
        
        // Check if avatars bucket exists
        const avatarsBucketExists = buckets.some(bucket => bucket.name === 'avatars');
        if (!avatarsBucketExists) {
          toast({
            title: "Setup required",
            description: "Please create an avatar first in the Avatar Generator",
            variant: "destructive",
          });
          console.log("Avatars bucket not found. Creating an avatar will create the necessary storage.");
          return false;
        }

        // Try to list from avatars bucket
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('avatars')
          .list(`user-${user.id}`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (storageError) {
          // If it's a 'Bucket not found' error, display a specific message
          if (storageError.message.includes("bucket not found") || 
              storageError.message.includes("not found")) {
            toast({
              title: "Setup required",
              description: "Please create an avatar first in the Avatar Generator",
              variant: "destructive",
            });
            console.error("Storage bucket not found:", storageError);
            return false;
          }
        }

        // If no data or empty array, no avatar exists
        if (!storageData || storageData.length === 0) {
          toast({
            title: "No avatar found",
            description: "Please create an avatar first in the Avatar Generator",
            variant: "destructive",
          });
          return false;
        }

        // Get public URL of the avatar
        const avatarPath = storageData[0].name;
        const avatarUrl = supabase.storage
          .from('avatars')
          .getPublicUrl(`user-${user.id}/${avatarPath}`).data.publicUrl;

        setUserAvatar(avatarUrl);
        return true;
      } catch (error) {
        console.error("Storage operation error:", error);
        toast({
          title: "Storage error",
          description: "Could not access your avatars. Please try again later.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      toast({
        title: "Error fetching avatar",
        description: "Could not retrieve your avatar image",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userAvatar,
    isLoading,
    fetchUserAvatar,
    setUserAvatar
  };
}
