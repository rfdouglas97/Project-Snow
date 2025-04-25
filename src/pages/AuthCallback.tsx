
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  useEffect(() => {
    // This function processes the authentication callback
    const handleAuthCallback = async () => {
      try {
        // Get the session and user data
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error.message);
          window.opener?.postMessage({
            type: "SUPABASE_AUTH_COMPLETE",
            success: false,
            error: error.message
          }, window.location.origin);
        } else {
          console.log("Authentication successful", data.session);
          // Send message to opener window with additional user data
          window.opener?.postMessage({
            type: "SUPABASE_AUTH_COMPLETE",
            success: true,
            session: data.session
          }, window.location.origin);
          
          // Store flag for popup flow in localStorage
          // This helps with handling redirect flows in some authentication scenarios
          if (localStorage.getItem('mira_popup_flow') === 'active') {
            localStorage.setItem('mira_popup_next_step', 'intro');
          }
        }
        
        // Close this popup window after sending the message
        setTimeout(() => window.close(), 300);
      } catch (error) {
        console.error("Error in auth callback:", error);
        window.opener?.postMessage({
          type: "SUPABASE_AUTH_COMPLETE",
          success: false,
          error: "Unknown error occurred"
        }, window.location.origin);
        setTimeout(() => window.close(), 300);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-mira-purple to-mira-pink">
      <div className="text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Authentication in progress...</h1>
        <p>Please wait while we complete your authentication.</p>
        <div className="mt-4">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
