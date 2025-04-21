
import React from "react";

/**
 * Consistent Mira Logo overlay for upper left of modals, matches Navbar logo exactly
 */
export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
    <img
      src="/lovable-uploads/aa9a914e-077a-4c57-b8f4-a66c0d337df2.png"
      alt="Mira"
      className="h-40 w-auto" // Doubled from h-20 to h-40
      draggable={false}
      style={{ background: "transparent", borderRadius: 0, boxShadow: "none" }}
    />
  </div>
);
