
import React from "react";

interface TryOnScreenProps {
  onBack: () => void;
  onClose: () => void;
  // Optionally: tryOnImageUrl?: string;
}

export const TryOnScreen: React.FC<TryOnScreenProps> = ({
  onBack, onClose
}) => {
  // TODO: Show dressed avatar, loading states, allow regenerate/close
  return (
    <div className="flex flex-col min-h-[700px] px-8 pt-10 items-center justify-center">
      <h2 className="text-2xl font-bold mb-6 text-mira-purple text-center">See Your Look!</h2>
      <div className="w-48 h-64 bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
        {/* TODO: Display the try-on result image from Supabase */}
        <span className="text-gray-400">[Try-on image]</span>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onBack}
          className="py-2 rounded bg-gray-100 border text-gray-700 shadow"
        >
          Back
        </button>
        <button
          onClick={onClose}
          className="py-3 rounded bg-mira-purple text-white font-semibold shadow hover:bg-mira-pink transition"
        >
          Close
        </button>
        {/* TODO: Regenerate, download functions */}
      </div>
    </div>
  );
};
