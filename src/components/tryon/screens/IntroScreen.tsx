import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AvatarViewScreen } from "./AvatarViewScreen";
import { AvatarUploadScreen } from "./AvatarUploadScreen";
import { TryOnPopupScreen } from "./TryOnPopupScreen";
import { PopupCloseButton } from "../common/PopupCloseButton";
import { MiraLogoOverlay } from "../common/MiraLogoOverlay";

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

  const firstName = React.useMemo(() => {
    const fullName = user?.user_metadata?.full_name || 
                    user?.user_metadata?.name;
                    
    if (fullName) {
      return fullName.split(' ')[0];
    }
    
    const directFirstName = user?.user_metadata?.given_name || 
                          user?.user_metadata?.first_name;
                          
    if (directFirstName) {
      return directFirstName;
    }
    
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      
      if (emailUsername.includes('.')) {
        return emailUsername.split('.')[0];
      }
      
      return emailUsername.replace(/\d+$/, '');
    }
    
    return "User";
  }, [user]);

  const handleTryOn = () => setTryOnPopupOpen(true);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-white">
      <MiraLogoOverlay />
      
      <PopupCloseButton onClick={onClose} />
      
      <div className="flex flex-col items-center w-full pt-20 pb-6">
        <h2 className="text-2xl font-bold text-mira-text text-center mb-4">
          Welcome {firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : ''}
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
          className="w-[310px] h-11 font-semibold text-base bg-gradient-to-r from-mira-purple to-mira-pink text-white flex gap-2 items-center justify-center shadow-md mb-3 mt-2 hover:opacity-90 transition-all"
          style={{
            borderRadius: "0.7rem",
            boxShadow: "0 2px 16px 0 rgba(106,28,248,0.10)",
          }}
        >
          <ArrowRight className="w-5 h-5 text-white" />
          Try on with Mira
        </Button>
        
        <div className="mb-4 text-lg text-mira-text font-semibold text-center">
          Click to try on "&quot;<span className="font-bold">Striped Shirt</span>&quot;"
        </div>
        
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
