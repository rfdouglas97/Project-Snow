
import { useState } from "react";
import { UploadForm } from "@/components/avatar/UploadForm";
import { ImagePreview } from "@/components/avatar/ImagePreview";
import { ProgressIndicator } from "@/components/avatar/ProgressIndicator";
import { GeneratedAvatar } from "@/components/avatar/GeneratedAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function AvatarGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(true);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setErrorMessage(null);
    
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setIsCompleted(false);
      setGeneratedAvatarUrl(null);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsCompleted(false);
    setGeneratedAvatarUrl(null);
    setErrorMessage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setIsCompleted(false);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to generate an avatar");
      }
      
      // Check file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error("File size exceeds 10MB limit");
      }
      
      // Calculate storage path
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `user-${user.id}/${fileName}`;
      
      // Check if we need to resize the image
      let finalFile = file;
      let imageWidth = 0;
      let imageHeight = 0;
      
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          imageWidth = img.width;
          imageHeight = img.height;
          resolve(null);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
      });
      
      // If image is too large, resize it
      if (imageWidth > 1024 || imageHeight > 1024) {
        setIsResizing(true);
        
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth = imageWidth;
        let newHeight = imageHeight;
        
        if (imageWidth > imageHeight && imageWidth > 1024) {
          newWidth = 1024;
          newHeight = Math.round((imageHeight * 1024) / imageWidth);
        } else if (imageHeight > 1024) {
          newHeight = 1024;
          newWidth = Math.round((imageWidth * 1024) / imageHeight);
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw the resized image
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert to Blob
        const resizedImageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to resize image"));
            }
          }, file.type);
        });
        
        // Create a new File from the Blob
        finalFile = new File([resizedImageBlob], fileName, { type: file.type });
        
        setIsResizing(false);
      }
      
      // Upload the original file to create avatar
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('original-avatars')
        .upload(filePath, finalFile, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Start AI processing
      setIsGenerating(true);
      
      // Get URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('original-avatars')
        .getPublicUrl(filePath);
      
      console.log('Calling avatar generation with uploaded image URL:', publicUrl);
      
      // Call the Supabase Edge function to process the image
      const { data, error: generationError } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          originalImageUrl: publicUrl,
          userId: user.id,
          includeImageResponse: true
        }
      });
      
      if (generationError) {
        console.error("Edge function error:", generationError);
        throw {
          message: "Failed to call avatar generation service",
          details: generationError
        };
      }
      
      if (data.error) {
        console.error("Generation error from edge function:", data.error);
        throw {
          message: "AI processing failed",
          details: data.error
        };
      }
      
      console.log('Avatar generation successful:', data);
      
      // Set the result
      setGeneratedAvatarUrl(data.avatarImageUrl);
      setIsAiGenerated(data.isAiGenerated !== false);
      
      // Save to database if needed
      if (data.avatarImagePath) {
        const { error: dbError } = await supabase
          .from('user_avatars')
          .insert({
            user_id: user.id,
            avatar_image_path: data.avatarImagePath,
            ai_generated: data.isAiGenerated !== false
          });
          
        if (dbError) {
          console.error("Database error when saving avatar:", dbError);
          // Don't throw, this is not critical
        }
      }
      
      setIsCompleted(true);
      toast({
        title: "Avatar created",
        description: data.isAiGenerated === false 
          ? "Using your original photo as the avatar (AI processing unavailable)" 
          : "AI-enhanced avatar successfully generated",
      });
      
    } catch (error) {
      console.error("Error during avatar generation:", error);
      const errorMessage = error.details 
        ? `AI Processing Failed: ${JSON.stringify(error.details)}` 
        : (error.message || "There was an error generating your avatar");
      
      toast({
        title: "Generation limited",
        description: errorMessage,
        variant: "destructive",
      });
      
      setErrorMessage(errorMessage);
      
      // Try to use the original image as fallback
      if (previewUrl) {
        setGeneratedAvatarUrl(previewUrl);
        setIsAiGenerated(false);
        setIsCompleted(true);
      }
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">AI Avatar Generator</h2>
            <p className="text-sm text-muted-foreground">
              Upload a photo to create a standardized professional avatar
            </p>
          </div>
          
          <UploadForm 
            isUploading={isUploading} 
            isGenerating={isGenerating} 
            onFileChange={handleFileChange} 
            onUpload={handleUpload} 
            file={file} 
          />
          
          <ProgressIndicator 
            isUploading={isUploading} 
            uploadProgress={uploadProgress} 
            isGenerating={isGenerating} 
            isResizing={isResizing}
            error={errorMessage}
          />
          
          <ImagePreview previewUrl={previewUrl} />
        </div>
        
        <div>
          <GeneratedAvatar 
            isCompleted={isCompleted} 
            generatedAvatarUrl={generatedAvatarUrl} 
            isAiGenerated={isAiGenerated}
            onReset={handleReset} 
          />
        </div>
      </div>
    </div>
  );
}
