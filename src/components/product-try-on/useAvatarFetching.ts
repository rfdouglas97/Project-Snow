
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

      // Get user's latest avatar from storage
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('avatars')
        .list(`user-${user.id}`, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (storageError || !storageData || storageData.length === 0) {
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
