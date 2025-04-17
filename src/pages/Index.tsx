
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { HeroSection } from "@/components/home/HeroSection";
import { UserProfile } from "@/components/home/UserProfile";
import { FeatureTabs } from "@/components/home/FeatureTabs";
import { BackendDocs } from "@/components/home/BackendDocs";

const Index = () => {
  const { user, handleSignOut } = useSupabaseAuth();

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <HeroSection />

        {user && <UserProfile user={user} onSignOut={handleSignOut} />}

        <FeatureTabs user={user} onSignOut={handleSignOut} />
        
        <BackendDocs />
      </div>
    </div>
  );
};

export default Index;
