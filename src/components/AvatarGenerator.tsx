
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Check, RefreshCw } from "lucide-react";

export function AvatarGenerator() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
    
    // Reset states when a new file is selected
    setGeneratedAvatarUrl(null);
    setIsCompleted(false);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload an avatar",
          variant: "destructive",
        });
        clearInterval(progressInterval);
        setIsUploading(false);
        return;
      }

      // Upload file to user_uploads bucket
      const fileName = `user-${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(progressInterval);
      
      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);

      // Get public URL of uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(fileName);

      // Call edge function to generate avatar
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          imageUrl: publicUrl,
          userId: user.id 
        }
      });

      if (error) {
        throw error;
      }

      // Set the generated avatar URL
      setGeneratedAvatarUrl(data.avatarUrl);
      setIsCompleted(true);
      
      toast({
        title: "Avatar generated",
        description: "Your custom avatar has been created successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error during avatar generation:", error);
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating your avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setGeneratedAvatarUrl(null);
    setIsCompleted(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your Avatar</CardTitle>
        <CardDescription>
          Upload a photo and we'll generate a personalized avatar for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isCompleted ? (
          <>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="avatar-image" className="text-sm font-medium leading-none">
                Select Image
              </label>
              <Input
                id="avatar-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={isUploading || isGenerating}
              />
            </div>
            
            {previewUrl && (
              <div className="mt-4 relative">
                <div className="rounded-md overflow-hidden border w-full h-64 flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="object-contain max-h-full"
                  />
                </div>
              </div>
            )}
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Uploading...</span>
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-center">Generating your avatar...</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center font-medium">Your Generated Avatar</div>
            <div className="flex justify-center">
              {generatedAvatarUrl ? (
                <Avatar className="h-40 w-40">
                  <AvatarImage src={generatedAvatarUrl} alt="Generated Avatar" />
                  <AvatarFallback>
                    <Skeleton className="h-40 w-40 rounded-full" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Skeleton className="h-40 w-40 rounded-full" />
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!isCompleted ? (
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading || isGenerating}
            className="w-full flex items-center justify-center gap-2"
          >
            {isUploading || isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isUploading ? "Uploading..." : "Generating..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Generate Avatar
              </>
            )}
          </Button>
        ) : (
          <div className="w-full flex gap-2">
            <Button variant="outline" onClick={resetForm} className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button className="flex-1 gap-2">
              <Check className="h-4 w-4" />
              Save Avatar
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
