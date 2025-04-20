
import React from "react";
import { X } from "lucide-react";

export const PopupCloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white/100 transition border border-gray-200 shadow"
    style={{ boxShadow: "0 2px 8px 0 rgba(90,30,180,0.06)" }}
    onClick={onClick}
    aria-label="Close"
    type="button"
  >
    <X className="w-5 h-5 text-gray-600" />
  </button>
);
