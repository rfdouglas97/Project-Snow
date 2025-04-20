
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AvatarViewScreen } from "./AvatarViewScreen";
import { AvatarUploadScreen } from "./AvatarUploadScreen";

interface IntroScreenProps {
  onNext: () => void;
  onBack?: () => void;
  onClose: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onNext, onBack }) => {
  const { user } = useSupabaseAuth();
  const [isAvatarViewOpen, setIsAvatarViewOpen] = React.useState(false);

  // Google returns first name as 'given_name' in user_metadata
  const firstName =
    user?.user_metadata?.given_name ||
    user?.user_metadata?.first_name ||
    user?.email?.split("@")[0] ||
    "User";

  // Avatar upload modal state
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = React.useState(false);

  return (
    <div className="relative flex flex-col min-h-[700px] w-full items-center justify-start px-4 sm:px-8 pt-6 pb-10 bg-white rounded-2xl shadow-md mx-auto">
      {/* Mira Logo */}
      <div className="w-full flex justify-start mb-3">
        <img
          src="/lovable-uploads/4a9e6bb2-27ae-42ad-9764-f1381ba11187.png"
          alt="Mira logo"
          className="w-28 h-auto"
        />
      </div>

      <div className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold text-mira-text text-center mb-1 mt-4">
          Welcome {firstName}
        </h2>
        
        {/* Product Image */}
        <div className="w-full flex justify-center mt-5 mb-4">
          <img
            src="https://80abf56c-759b-449a-9d84-dc9ecb2b2969.lovableproject.com/lovable-uploads/b6bfa933-c408-42a4-a596-9b701e86dfa3.png"
            alt="Striped Shirt"
            className="rounded-lg shadow-lg border object-contain aspect-[3/4] max-h-72 max-w-xs bg-white"
            style={{ background: "#fff" }}
          />
        </div>

        {/* Try On Button with gradient */}
        <Button
          onClick={onNext}
          className="w-[310px] h-12 font-semibold text-base bg-gradient-to-r from-mira-purple to-mira-pink text-white flex gap-2 items-center justify-center shadow-md mb-5 mt-2 hover:opacity-90 transition-all"
          style={{
            borderRadius: "0.7rem",
            boxShadow: "0 2px 16px 0 rgba(106,28,248,0.10)",
          }}
        >
          <ArrowRight className="w-5 h-5 text-white" />
          Try on with Mira
        </Button>

        {/* Product name/subtitle */}
        <div className="mb-6 mt-2 text-lg text-mira-text font-semibold text-center">
          Click to try on "<span className="font-bold">Striped Shirt</span>"
        </div>

        {/* Secondary action buttons */}
        <div className="flex flex-col gap-2 w-[310px]">
          <Button
            variant="outline"
            className="w-full border-mira-purple text-mira-purple font-medium hover:bg-mira-purple/10"
            type="button"
            onClick={() => setIsAvatarViewOpen(true)}
          >
            View my Avatar
          </Button>
          <Button
            variant="outline"
            className="w-full border-mira-purple text-mira-purple font-medium hover:bg-mira-purple/10"
            type="button"
            onClick={() => setIsAvatarUploadOpen(true)}
          >
            Change my Avatar
          </Button>
        </div>
      </div>
      {/* Pop-up Avatar View Screen */}
      <AvatarViewScreen
        open={isAvatarViewOpen}
        onClose={() => setIsAvatarViewOpen(false)}
        onBackToIntro={() => setIsAvatarViewOpen(false)}
        onGoToAvatarUpload={() => {
          setIsAvatarViewOpen(false);
          setIsAvatarUploadOpen(true);
        }}
      />
      {/* Pop-up Avatar Upload Screen */}
      {isAvatarUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <AvatarUploadScreen
            onNext={() => setIsAvatarUploadOpen(false)}
            onBack={() => {
              setIsAvatarUploadOpen(false);
              setIsAvatarViewOpen(true);
            }}
            onClose={() => setIsAvatarUploadOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
