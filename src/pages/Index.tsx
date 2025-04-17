
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/FileUpload";
import { AuthButtons } from "@/components/AuthButtons";
import { ApiDemo } from "@/components/ApiDemo";
import AvatarGenerator from "@/components/AvatarGenerator";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VirtualTryOn } from "@/components/VirtualTryOn";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-mira-text font-heading sm:text-5xl lg:text-6xl">
            Virtual Try-On with <span className="text-transparent bg-clip-text bg-gradient-primary">Mira</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-mira-text/80">
            Let your customers try before they buy
          </p>
          <div className="mt-8">
            <Link to="/demo">
              <Button size="lg" className="bg-gradient-primary rounded-full px-8 py-6 text-lg font-medium hover:shadow-lg transition-shadow duration-300">
                Try on with Mira
              </Button>
            </Link>
          </div>
        </div>

        {user && (
          <div className="mb-8 flex flex-col items-center justify-center">
            <Avatar className="h-20 w-20 mb-4 border-2 border-mira-purple">
              {user.user_metadata.avatar_url ? (
                <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name || "User"} />
              ) : (
                <AvatarFallback className="bg-mira-purple text-white">{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-2xl font-bold font-heading text-mira-text">Welcome, {user.user_metadata.full_name || user.email}</h2>
            <Button onClick={handleSignOut} variant="outline" className="mt-2 border-mira-purple/30 text-mira-purple hover:bg-mira-purple/10">
              Sign Out
            </Button>
          </div>
        )}

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-full p-1 bg-white">
            <TabsTrigger value="auth" className="rounded-full data-[state=active]:bg-mira-purple data-[state=active]:text-white">Authentication</TabsTrigger>
            <TabsTrigger value="storage" className="rounded-full data-[state=active]:bg-mira-purple data-[state=active]:text-white">Try on Products</TabsTrigger>
            <TabsTrigger value="avatar" className="rounded-full data-[state=active]:bg-mira-purple data-[state=active]:text-white">Avatar Generator</TabsTrigger>
            <TabsTrigger value="api" className="rounded-full data-[state=active]:bg-mira-purple data-[state=active]:text-white">API Testing</TabsTrigger>
          </TabsList>
          
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
                    <Button onClick={handleSignOut} className="mt-4 bg-mira-purple hover:bg-mira-purple/90">
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
        
        <div className="mt-12 bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-mira-text font-heading">
              Backend Documentation
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-mira-text/70">
              Key endpoints and configuration details
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-mira-text/70">Authentication</dt>
                <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-mira-background rounded">/api/auth/google</code>,{" "}
                  <code className="px-2 py-1 bg-mira-background rounded">/api/auth/apple</code>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-mira-text/70">File Upload</dt>
                <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-mira-background rounded">/api/storage/upload</code>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-mira-text/70">Avatar Generation</dt>
                <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-mira-background rounded">/functions/generate-avatar</code>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-mira-text/70">File Retrieval</dt>
                <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-mira-background rounded">/api/storage/files</code>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
