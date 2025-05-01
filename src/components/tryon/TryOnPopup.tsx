
import React from "react";
import { PopupCloseButton } from "./common/PopupCloseButton";

interface TryOnPopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const TryOnPopup: React.FC<TryOnPopupProps> = ({
  open,
  onClose,
  children,
}) => {
  if (!open) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // Close only if clicking directly on the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Fixed-size container with no scrolling */}
      <div className="relative bg-white rounded-xl shadow-xl w-[500px] h-[600px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Added close button directly in the popup */}
        <PopupCloseButton onClick={onClose} />
        
        {/* Content container */}
        <div className="w-full h-full">{children}</div>
      </div>
    </div>
  );
};
