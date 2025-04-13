
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useAvatarFetching() {
  const { toast } = useToast();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(false);
        return false;
      }

      // First try to get the latest avatar from the database
      const { data: avatarData, error: avatarError } = await supabase
        .from('user_avatars')
        .select('avatar_image_path')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (avatarError) {
        console.error("Database error:", avatarError);
        throw avatarError;
      }

      if (avatarData?.avatar_image_path) {
        console.log("Found avatar path in database:", avatarData.avatar_image_path);
        
        // Path format in DB is 'avatars/user-{userId}/{filename}.png'
        const pathParts = avatarData.avatar_image_path.split('/');
        const bucketName = pathParts[0];
        const avatarPath = pathParts.slice(1).join('/');
        
        // Get public URL of the avatar
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(avatarPath);

        console.log("Retrieved avatar URL:", publicUrl);
        setUserAvatar(publicUrl);
        setIsLoading(false);
        return true;
      }

      // Fallback to directly checking storage if no database record found
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
        setIsLoading(false);
        return false;
      }

      // Get public URL of the avatar
      const avatarPath = `${userFolder}/${storageData[0].name}`;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarPath);

      console.log("Found user avatar at:", publicUrl);
      setUserAvatar(publicUrl);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      toast({
        title: "Error fetching avatar",
        description: "Could not retrieve your avatar image",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  return { userAvatar, fetchUserAvatar, setUserAvatar, isLoading };
}
