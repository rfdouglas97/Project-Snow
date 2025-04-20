
import React from "react";

/**
 * Consistent Mira Logo overlay for upper left of modals
 */
export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
    <img
      src="/lovable-uploads/4a9e6bb2-27ae-42ad-9764-f1381ba11187.png"
      alt="Mira logo"
      className="w-24 h-auto"
      draggable={false}
      style={{ background: "transparent", borderRadius: 14, boxShadow: "none" }}
    />
  </div>
);
