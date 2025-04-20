
import React from "react";

interface IntroScreenProps {
  onNext: () => void;
  onBack?: () => void;
  onClose: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onNext, onBack }) => {
  return (
    <div className="flex flex-col min-h-[700px] px-8 pt-10 items-center justify-center">
      <h2 className="text-2xl font-bold mb-4 text-mira-purple text-center">Welcome to Mira Virtual Try-On</h2>
      <p className="text-center text-gray-600 mb-8">
        Try outfits on your real body in seconds—just one photo, and Mira will handle the rest!
        No app installs needed. Let's see how you look in this item.
      </p>
      <div className="flex flex-col gap-3 w-full">
        {onBack && (
          <button
            onClick={onBack}
            className="py-2 rounded bg-gray-100 border text-gray-700 shadow"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="py-3 mt-2 rounded bg-mira-purple text-white font-semibold shadow hover:bg-mira-pink transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};
