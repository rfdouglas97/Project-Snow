
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useAvatarFetching() {
  const { toast } = useToast();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const fetchUserAvatar = async () => {
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

      // User folder path in storage
      const userFolder = `user-${user.id}`;
      
      // Get user's latest avatar from storage
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('avatars')
        .list(userFolder, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (storageError) {
        console.error("Storage error:", storageError);
        throw storageError;
      }

      if (!storageData || storageData.length === 0) {
        toast({
          title: "No avatar found",
          description: "Please create an avatar first in the Avatar Generator",
          variant: "destructive",
        });
        return false;
      }

      // Get public URL of the avatar
      const avatarPath = `${userFolder}/${storageData[0].name}`;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarPath);

      console.log("Found user avatar at:", publicUrl);
      setUserAvatar(publicUrl);
      return true;
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      toast({
        title: "Error fetching avatar",
        description: "Could not retrieve your avatar image",
        variant: "destructive",
      });
      return false;
    }
  };

  return { userAvatar, fetchUserAvatar, setUserAvatar };
}
