
import React from "react";
import { MiraLogoOverlay } from "../common/MiraLogoOverlay";
import { PopupCloseButton } from "../common/PopupCloseButton";

interface TryOnScreenProps {
  onBack: () => void;
  onClose: () => void;
}

export const TryOnScreen: React.FC<TryOnScreenProps> = ({
  onBack, onClose
}) => {
  return (
    <div className="relative w-[500px] h-[600px] flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg overflow-hidden">
      <MiraLogoOverlay />
      <PopupCloseButton onClick={onClose} />
      <h2 className="text-2xl font-bold mb-6 text-mira-purple text-center mt-10">
        See Your Look!
      </h2>
      <div className="w-48 h-64 bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
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
      </div>
    </div>
  );
};
