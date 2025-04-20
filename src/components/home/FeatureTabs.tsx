
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/components/AuthButtons";
import { ApiDemo } from "@/components/ApiDemo";
import AvatarGenerator from "@/components/AvatarGenerator";
import { VirtualTryOn } from "@/components/VirtualTryOn";
import { useIsMobile } from "@/hooks/use-mobile";

interface FeatureTabsProps {
  user: User | null;
  onSignOut: () => Promise<void>;
}

export function FeatureTabs({ user, onSignOut }: FeatureTabsProps) {
  const isMobile = useIsMobile();
  
  return (
    <Tabs defaultValue="auth" className="w-full">
      <div className="bg-white rounded-lg p-2">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-transparent">
          <TabsTrigger 
            value="auth" 
            className="rounded-lg py-2 px-2 text-xs sm:text-sm transition-all data-[state=active]:bg-mira-purple data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Authentication
          </TabsTrigger>
          <TabsTrigger 
            value="storage" 
            className="rounded-lg py-2 px-2 text-xs sm:text-sm transition-all data-[state=active]:bg-mira-purple data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Try on Products
          </TabsTrigger>
          <TabsTrigger 
            value="avatar" 
            className="rounded-lg py-2 px-2 text-xs sm:text-sm transition-all data-[state=active]:bg-mira-purple data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Avatar Generator
          </TabsTrigger>
          <TabsTrigger 
            value="api" 
            className="rounded-lg py-2 px-2 text-xs sm:text-sm transition-all data-[state=active]:bg-mira-purple data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            API Testing
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="auth" className="mt-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-mira-text font-heading">OAuth Authentication</CardTitle>
            <CardDescription>
              {user 
                ? "You are currently signed in." 
                : "Sign in with Google or Apple to test the authentication flow"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="text-center">
                <p>Signed in as: {user.email}</p>
                <Button onClick={onSignOut} className="mt-4 bg-mira-purple hover:bg-mira-purple/90">
                  Sign Out
                </Button>
              </div>
            ) : (
              <AuthButtons />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-mira-text/60">
              Securely handled through Supabase Auth
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="storage" className="mt-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-mira-text font-heading">Try on Products</CardTitle>
            <CardDescription>
              Upload clothing items or provide image URLs to try them on
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VirtualTryOn />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-mira-text/60">
              Powered by GPT-4o and Supabase
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="avatar" className="mt-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-mira-text font-heading">Avatar Generator</CardTitle>
            <CardDescription>
              Create a personalized avatar using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarGenerator />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-mira-text/60">
              Powered by OpenAI and Supabase Edge Functions
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="api" className="mt-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-mira-text font-heading">Flask API Testing</CardTitle>
            <CardDescription>
              Test the Flask backend endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiDemo />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-mira-text/60">
              Endpoints are protected by authentication
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
