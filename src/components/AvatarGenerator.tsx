
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { UploadForm } from "./avatar/UploadForm";
import { ImagePreview } from "./avatar/ImagePreview";
import { ProgressIndicator } from "./avatar/ProgressIndicator";
import { GeneratedAvatar } from "./avatar/GeneratedAvatar";

export function AvatarGenerator() {
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
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          imageUrl: publicUrl,
          userId: user.id 
        }
      });

      if (error) {
        console.error("Function error:", error);
        setError(`Edge function error: ${error.message}`);
        throw error;
      }

      // Check if the response contains an error
      if (data.error) {
        console.error("Generation error:", data.error, data.details);
        setError(`Image generation error: ${data.error}. ${data.details ? JSON.stringify(data.details) : ''}`);
        throw new Error(data.error);
      }

      console.log("Generated avatar response:", data);

      // Set the generated avatar URL
      setGeneratedAvatarUrl(data.avatarUrl);
      setIsCompleted(true);
      
      toast({
        title: "Avatar generated",
        description: "Your standardized avatar has been created with GPT-4o",
        variant: "default",
      });
    } catch (error) {
      console.error("Error during avatar generation:", error);
      const errorMessage = error.message || "There was an error generating your avatar";
      
      if (!error) {
        setError(errorMessage);
      }
      
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
