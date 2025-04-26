import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AvatarViewScreen } from "./AvatarViewScreen";
import { AvatarUploadScreen } from "./AvatarUploadScreen";
import { TryOnPopupScreen } from "./TryOnPopupScreen";
import { MiraLogoOverlay } from "../common/MiraLogoOverlay";
import { PopupCloseButton } from "../common/PopupCloseButton";

interface IntroScreenProps {
  onNext: () => void;
  onBack?: () => void;
  onClose: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onNext, onBack, onClose }) => {
  const { user } = useSupabaseAuth();
  const [isAvatarViewOpen, setIsAvatarViewOpen] = React.useState(false);
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = React.useState(false);
  const [tryOnPopupOpen, setTryOnPopupOpen] = React.useState(false);

  const firstName =
    user?.user_metadata?.given_name ||
    user?.user_metadata?.first_name ||
    user?.email?.split("@")[0] ||
    "User";

  const handleTryOn = () => setTryOnPopupOpen(true);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-white">
      <div className="absolute top-4 left-4 w-48 h-auto">
        <img
          src="/lovable-uploads/26499bdc-6454-479a-8425-ccd317141be5.png"
          alt="Mira Logo"
          className="w-full h-full object-contain"
        />
      </div>
      <PopupCloseButton onClick={onClose} />
      
      <div className="flex flex-col items-center w-full pt-16 pb-2">
        <h2 className="text-2xl font-bold text-mira-text text-center mb-4">
          Welcome {firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''}
        </h2>
        
        <div className="w-full flex justify-center mt-2 mb-4">
          <img
            src="/lovable-uploads/b6bfa933-c408-42a4-a596-9b701e86dfa3.png"
            alt="Striped Shirt"
            className="rounded-lg shadow-sm border object-contain h-56 max-w-[240px] bg-white"
          />
        </div>
        
        <Button
          onClick={handleTryOn}
          className="w-[310px] h-11 font-semibold text-base bg-gradient-to-r from-mira-purple to-mira-pink text-white flex gap-2 items-center justify-center shadow-md mb-8 mt-2 hover:opacity-90 transition-all"
          style={{
            borderRadius: "0.7rem",
            boxShadow: "0 2px 16px 0 rgba(106,28,248,0.10)",
          }}
        >
          <ArrowRight className="w-5 h-5 text-white" />
          Try on with Mira
        </Button>
        
        <div className="mb-8 text-lg text-mira-text font-semibold text-center">
          Click to try on "&quot;<span className="font-bold">Striped Shirt</span>&quot;"
        </div>
        
        <div className="flex flex-col gap-2 w-[310px] mb-8">
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
      
      <div className="mb-4 text-center w-full">
        <a
          href="https://www.trymira.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-mira-text font-semibold text-sm rounded px-4 py-1 transition"
        >
          www.getmira.xyz
        </a>
      </div>

      <AvatarViewScreen
        open={isAvatarViewOpen}
        onClose={() => setIsAvatarViewOpen(false)}
        onBackToIntro={() => setIsAvatarViewOpen(false)}
        onGoToAvatarUpload={() => {
          setIsAvatarViewOpen(false);
          setIsAvatarUploadOpen(true);
        }}
      />
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
      <TryOnPopupScreen 
        open={tryOnPopupOpen} 
        onClose={() => setTryOnPopupOpen(false)}
      />
    </div>
  );
};
