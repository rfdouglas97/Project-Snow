import React from "react";
import { X, Edit, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarViewScreenProps {
  open: boolean;
  onClose: () => void;
  onEditAvatar?: () => void;
  onBackToIntro: () => void;
  onGoToAvatarUpload: () => void;
}

export const AvatarViewScreen: React.FC<AvatarViewScreenProps> = ({
  open,
  onClose,
  onBackToIntro,
  onGoToAvatarUpload,
}) => {
  const { user } = useSupabaseAuth();
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) {
        setAvatarUrl(null);
        return;
      }

      setIsLoading(true);
      const { data: avatarData, error } = await supabase.storage
        .from("avatars")
        .list(`user-${user.id}`, {
          limit: 1,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (!error && avatarData && avatarData.length > 0) {
        const avatarPath = avatarData[0].name;
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(`user-${user.id}/${avatarPath}`);
        setAvatarUrl(publicUrlData.publicUrl);
      } else {
        setAvatarUrl(null);
      }
      setIsLoading(false);
    };

    if (open) fetchAvatar();
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-[95vw] max-w-xs shadow-lg relative flex flex-col items-center py-2 px-0">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Custom Logo */}
        <div className="flex items-center justify-center mb-2 mt-3">
          <img 
            src="/lovable-uploads/mira-logo.png" 
            alt="Mira Logo"
            className="w-8 h-8 object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-mira-text text-center mb-2">
          {"Your Avatar"}
        </h2>

        {/* Avatar Image */}
        <div className="mb-2 flex justify-center w-full">
          {isLoading ? (
            <Skeleton className="w-[210px] h-[270px] rounded-lg" />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Your Avatar"
              className="w-[210px] h-[270px] object-cover rounded-lg border bg-white shadow"
              style={{ background: "#fff" }}
            />
          ) : (
            <div className="w-[210px] h-[270px] flex items-center justify-center bg-gray-100 rounded-lg border shadow text-gray-500">
              No avatar found
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col pt-2 gap-2 w-[85%]">
          <Button
            className="w-full bg-gradient-to-r from-mira-purple to-mira-pink font-semibold text-white py-2 text-base shadow hover:opacity-90 transition-all"
            style={{ borderRadius: "0.6rem" }}
            onClick={onGoToAvatarUpload}
          >
            <Edit className="w-5 h-5 mr-2" /> Edit my Avatar
          </Button>
          <Button
            type="button"
            className="w-full border-mira-purple text-mira-purple font-medium hover:bg-mira-purple/10"
            variant="outline"
            onClick={onBackToIntro}
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Return / Back
          </Button>
        </div>
        <div className="pb-3 pt-1 text-xs text-gray-400 text-center w-full" />
      </div>
    </div>
  );
};