import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { UploadForm } from "./avatar/UploadForm";
import { ImagePreview } from "./avatar/ImagePreview";
import { ProgressIndicator } from "./avatar/ProgressIndicator";
import { GeneratedAvatar } from "./avatar/GeneratedAvatar";

export default function AvatarGenerator() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File | null) => {
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
    setError(null);
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
      setError(null);
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
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

      // Create user folder if it doesn't exist
      const userFolder = `user-${user.id}`;
      
      // Upload file to user_uploads bucket
      const fileName = `${userFolder}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(progressInterval);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      setUploadProgress(100);

      // Get public URL of uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(fileName);

      console.log("File uploaded to:", publicUrl);
      toast({
        title: "Upload successful",
        description: "Your photo has been uploaded. Now generating your standardized avatar...",
      });

      // Call edge function to generate avatar with GPT-4o
      setIsGenerating(true);
      
      try {
        console.log("Starting avatar generation request...");
        const { data, error: functionError } = await supabase.functions.invoke('generate-avatar', {
          body: { 
            imageUrl: publicUrl,
            userId: user.id 
          }
        });

        console.log("Full function response:", { data, functionError });

        if (functionError) {
          console.error("Function invocation error:", functionError);
          throw new Error(`Edge function error: ${functionError.message}`);
        }

        // Check if the response contains an error
        if (data?.error) {
          console.error("Generation error:", data.error, data.details);
          throw new Error(`Image generation error: ${data.error}. ${data.details ? JSON.stringify(data.details) : ''}`);
        }

        console.log("Generated avatar response:", data);

        // Set the generated avatar URL
        setGeneratedAvatarUrl(data.avatarUrl);
        setIsCompleted(true);
        
        toast({
          title: "Avatar generated",
          description: "Your standardized avatar has been created.",
          variant: "default",
        });
      } catch (functionError) {
        console.error("Detailed error during edge function call:", functionError);
        
        // Capture and display more specific error information
        const errorMessage = functionError instanceof Error 
          ? functionError.message 
          : 'Unknown error occurred during avatar generation';
        
        setError(errorMessage);
        
        toast({
          title: "Generation failed",
          description: errorMessage,
          variant: "destructive",
        });

        // Log additional information about the environment
        console.log("Supabase Functions Information:", {
          projectUrl: supabase.supabaseUrl || 'Unknown'
        });
      }
    } catch (error) {
      console.error("Comprehensive error during avatar generation:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "There was an unexpected error generating your avatar";
      
      setError(errorMessage);
      
      toast({
        title: "Generation failed",
        description: errorMessage,
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
    setError(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your Avatar</CardTitle>
        <CardDescription>
          Upload a photo and we'll generate a standardized avatar with GPT-4o
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isCompleted ? (
          <>
            <UploadForm 
              isUploading={isUploading} 
              isGenerating={isGenerating} 
              onFileChange={handleFileChange} 
              onUpload={handleUpload} 
              file={file} 
            />
            
            <ImagePreview previewUrl={previewUrl} />
            
            <ProgressIndicator 
              isUploading={isUploading} 
              uploadProgress={uploadProgress} 
              isGenerating={isGenerating}
              error={error}
            />
          </>
        ) : (
          <GeneratedAvatar 
            isCompleted={isCompleted} 
            generatedAvatarUrl={generatedAvatarUrl} 
            onReset={resetForm} 
          />
        )}
      </CardContent>
    </Card>
  );
}
