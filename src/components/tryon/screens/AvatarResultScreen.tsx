
import React from "react";

interface AvatarResultScreenProps {
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  // Optionally: avatarUrl?: string;
}

export const AvatarResultScreen: React.FC<AvatarResultScreenProps> = ({
  onNext, onBack
}) => {
  // TODO: Display generated avatar, allow download, regenerate, proceed, or close
  return (
    <div className="flex flex-col min-h-[700px] px-8 pt-10 items-center justify-center">
      <h2 className="text-2xl font-bold mb-4 text-mira-purple text-center">Your Avatar is Ready!</h2>
      <div className="w-40 h-52 bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
        {/* TODO: Show generated avatar image from Supabase */}
        <span className="text-gray-400">[Avatar image]</span>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onNext}
          className="py-3 rounded bg-mira-purple text-white font-semibold shadow hover:bg-mira-pink transition"
        >
          Try On Clothing
        </button>
        <button
          onClick={onBack}
          className="py-2 rounded bg-gray-100 border text-gray-700 shadow"
        >
          Upload Again
        </button>
        {/* TODO: Download, regenerate, or close buttons */}
      </div>
    </div>
  );
};
