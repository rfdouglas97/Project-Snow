
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";
import { MiraLogoOverlay } from "../common/MiraLogoOverlay";
import { PopupCloseButton } from "../common/PopupCloseButton";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarResultScreenProps {
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  avatarUrl: string | null;
  onTryAgain: () => void;
  onReturnToIntro: () => void;
}

export const AvatarResultScreen: React.FC<AvatarResultScreenProps> = ({
  onNext,
  onBack,
  avatarUrl,
  onTryAgain,
  onReturnToIntro,
  onClose,
}) => {
  return (
    <div className="relative w-[500px] h-[600px] flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg max-w-[400px] mx-auto overflow-hidden">
      <MiraLogoOverlay />
      <PopupCloseButton onClick={onClose} />
      <h2 className="text-2xl font-bold mb-4 text-mira-purple text-center mt-10">
        Create Your Avatar
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600 px-4 max-w-[350px]">
        Upload a photo and we&apos;ll generate a standardized avatar with GPT-4o
      </p>
      <div className="w-60 h-72 rounded-lg border border-gray-300 overflow-hidden mb-4 shadow-sm bg-white flex items-center justify-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Generated Avatar"
            className="object-contain w-full h-full"
            loading="eager"
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
      </div>
      <p className="text-center text-xs text-gray-500 mb-6 max-w-[320px] px-2">
        Your full-body avatar has been generated with neutral-colored clothing
        and background
      </p>
      <div className="flex gap-3 w-full max-w-[320px] px-4 mb-4">
        <Button
          variant="outline"
          onClick={onTryAgain}
          className="flex-1 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button className="flex-1 gap-2 bg-mira-purple hover:bg-mira-pink">
          <Check className="h-4 w-4" />
          Avatar Saved
        </Button>
      </div>
      <Button
        className="w-full max-w-[320px] bg-mira-purple text-white font-semibold py-2 mt-2"
        onClick={onNext}
      >
        Continue to Try On
      </Button>
      <Button
        variant="outline"
        className="w-full max-w-[320px] border-mira-purple text-mira-purple font-medium hover:bg-mira-purple/10 py-2 mt-3"
        onClick={onReturnToIntro}
      >
        Return to Try On Screen
      </Button>
    </div>
  );
};
