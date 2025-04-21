
import React from "react";

/**
 * Consistent Mira Logo overlay for upper left of modals, matches Navbar logo exactly
 */
export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
    <img
      src="/lovable-uploads/4cbcba54-90df-4492-9f31-fbd34f7eec11.png"
      alt="Mira"
      className="h-20 w-auto"
      draggable={false}
      style={{ background: "transparent", borderRadius: 0, boxShadow: "none" }}
    />
  </div>
);
