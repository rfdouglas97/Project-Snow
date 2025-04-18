
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

      // Try to fetch user avatar from avatars table or user_uploads
      let avatarUrl = null;
      
      // First check the avatars bucket directly
      const { data: avatarData, error: avatarError } = await supabase.storage
        .from('avatars')
        .list(`user-${user.id}`, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (!avatarError && avatarData && avatarData.length > 0) {
        // Found avatar in the avatars bucket
        const avatarPath = avatarData[0].name;
        avatarUrl = supabase.storage
          .from('avatars')
          .getPublicUrl(`user-${user.id}/${avatarPath}`).data.publicUrl;
      } else {
        // If not found, check user_uploads bucket
        console.log("Checking user_uploads bucket for avatar");
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user_uploads')
          .list(`user-${user.id}`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (!uploadError && uploadData && uploadData.length > 0) {
          // Use the latest upload as the avatar
          const uploadPath = uploadData[0].name;
          avatarUrl = supabase.storage
            .from('user_uploads')
            .getPublicUrl(`user-${user.id}/${uploadPath}`).data.publicUrl;
        }
      }

      if (!avatarUrl) {
        // No avatar found in either location
        console.log("No avatar found in any bucket");
        toast({
          title: "No avatar found",
          description: "Please create an avatar first in the Avatar Generator",
          variant: "destructive",
        });
        return false;
      }

      console.log("Avatar found:", avatarUrl);
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
