
import React from "react";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Fixed-size card, no scrolling, no logo above card */}
      <div className="relative bg-white rounded-xl shadow-xl w-[500px] h-[600px] flex flex-col justify-center items-center p-0">
        <button
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
        {/* Content is rendered here; card size and centering handled by parent */}
        <div className="w-full h-full flex flex-col">{children}</div>
      </div>
    </div>
  );
};
