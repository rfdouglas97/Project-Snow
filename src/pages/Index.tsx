
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/FileUpload";
import { AuthButtons } from "@/components/AuthButtons";
import { ApiDemo } from "@/components/ApiDemo";
import { AvatarGenerator } from "@/components/AvatarGenerator";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Flask + Supabase
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            A modern OAuth authentication system with secure image storage
          </p>
          <div className="mt-6">
            <Link to="/products">
              <Button size="lg" className="mx-2">
                Try on Products Demo
              </Button>
            </Link>
          </div>
        </div>

        {user && (
          <div className="mb-8 flex flex-col items-center justify-center">
            <Avatar className="h-20 w-20 mb-4">
              {user.user_metadata.avatar_url ? (
                <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name || "User"} />
              ) : (
                <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-2xl font-bold">Welcome, {user.user_metadata.full_name || user.email}</h2>
            <Button onClick={handleSignOut} variant="outline" className="mt-2">
              Sign Out
            </Button>
          </div>
        )}

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="storage">File Storage</TabsTrigger>
            <TabsTrigger value="avatar">Avatar Generator</TabsTrigger>
            <TabsTrigger value="api">API Testing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="auth" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>OAuth Authentication</CardTitle>
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
                    <Button onClick={handleSignOut} className="mt-4">
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <AuthButtons />
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-gray-500">
                  Securely handled through Supabase Auth
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="storage" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Secure File Upload</CardTitle>
                <CardDescription>
                  Upload images to Supabase Storage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload />
              </CardContent>
              <CardFooter>
                <p className="text-sm text-gray-500">
                  Files are stored securely in your Supabase bucket
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="avatar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Avatar Generator</CardTitle>
                <CardDescription>
                  Create a personalized avatar using AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarGenerator />
              </CardContent>
              <CardFooter>
                <p className="text-sm text-gray-500">
                  Powered by OpenAI and Supabase Edge Functions
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Flask API Testing</CardTitle>
                <CardDescription>
                  Test the Flask backend endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiDemo />
              </CardContent>
              <CardFooter>
                <p className="text-sm text-gray-500">
                  Endpoints are protected by authentication
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-12 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Backend Documentation
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Key endpoints and configuration details
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Authentication</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-gray-100 rounded">/api/auth/google</code>,{" "}
                  <code className="px-2 py-1 bg-gray-100 rounded">/api/auth/apple</code>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">File Upload</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-gray-100 rounded">/api/storage/upload</code>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Avatar Generation</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-gray-100 rounded">/functions/generate-avatar</code>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">File Retrieval</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <code className="px-2 py-1 bg-gray-100 rounded">/api/storage/files</code>
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
