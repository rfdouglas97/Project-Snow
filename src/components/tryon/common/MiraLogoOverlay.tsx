
import React from "react";

/**
 * Consistent Mira Logo overlay for upper left of modals, matches Navbar logo exactly
 */
export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
    <img
      src="/lovable-uploads/b2f99f37-05c4-4fef-99be-532dc5f5d3fb.png"
      alt="Mira"
      className="h-20 w-auto"
      draggable={false}
      style={{ background: "transparent", borderRadius: 0, boxShadow: "none" }}
    />
  </div>
);
