import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { PopupCloseButton } from "../common/PopupCloseButton";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AvatarUploadScreenProps {
  onNext: (avatarUrl?: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export const AvatarUploadScreen: React.FC<AvatarUploadScreenProps> = ({
  onNext, onBack, onClose
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleCreateAvatar = async () => {
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
        setIsUploading(false);
        return;
      }

      const userFolder = `user-${user.id}`;
      
      // Upload image to user_uploads bucket
      const fileName = `${userFolder}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      toast({
        title: "Upload successful",
        description: "Your photo has been uploaded. Now generating your standardized avatar...",
      });

      // Get public URL of uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(fileName);
      
      console.log("File uploaded to:", publicUrl);
      
      // Generate avatar using edge function
      setIsGenerating(true);
      const { data, error: functionError } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          imageUrl: publicUrl,
          userId: user.id 
        }
      });

      if (functionError) {
        console.error("Function invocation error:", functionError);
        throw new Error(`Edge function error: ${functionError.message}`);
      }

      if (data?.error) {
        console.error("Generation error:", data.error);
        throw new Error(`Image generation error: ${data.error}`);
      }

      console.log("Generated avatar response:", data);
      toast({
        title: "Avatar generated",
        description: "Your standardized avatar has been created.",
      });

      // Pass the avatar URL to the next screen
      onNext(data.avatarUrl);
      
    } catch (error) {
      console.error("Error during avatar generation:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "There was an unexpected error generating your avatar";
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-[500px] h-[600px] flex flex-col items-center pt-8 pb-6 px-4 bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Updated logo with new image path */}
      <div className="absolute top-4 left-4 flex items-center">
        <img 
          src="/lovable-uploads/aa9a914e-077a-4c57-b8f4-a66c0d337df2.png" 
          alt="Mira Logo"
          width={48}
          height={48}
          className="object-contain"
        />
        <div className="ml-2 text-[#8a3ffc] font-bold text-xl">
          Create Your Avatar
        </div>
      </div>
      
      <PopupCloseButton onClick={onClose} />
      <div className="bg-white border rounded-xl p-5 w-full max-w-[320px] shadow flex flex-col items-stretch mb-1 mt-16">
        <p className="mb-2 text-xs text-center text-gray-500">
          Upload a photo and we'll generate a standardized avatar with GPT-4o
        </p>
        {/* File input */}
        <div className="my-2">
          <label
            htmlFor="avatar-image"
            className="text-sm font-medium leading-none block mb-2"
          >
            Select Image
          </label>
          <input
            id="avatar-image"
            type="file"
            accept="image/*"
            className="mb-2 w-full text-xs border border-gray-200 rounded px-2 py-1 file:bg-mira-purple file:text-white file:rounded file:px-3 file:py-2"
            disabled={isUploading || isGenerating}
            onChange={handleFileChange}
          />
        </div>
        <Button
          onClick={handleCreateAvatar}
          className="w-full flex items-center justify-center gap-2 bg-mira-purple hover:bg-mira-pink text-white transition font-semibold py-2"
          disabled={!file || isUploading || isGenerating}
        >
          {(isUploading || isGenerating) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? "Uploading..." : isGenerating ? "Generating..." : "Create Standardized Avatar"}
        </Button>
      </div>
      <div className="w-full max-w-[320px] mt-4 mb-3 text-gray-700 text-sm">
        <div className="font-bold mb-1">Guidelines for Creating your Avatar:</div>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>Either upload pre-existing photo or take fresh photo</li>
          <li>Ensure full body visible</li>
          <li>Make sure lighting conditions make features discernible</li>
          <li>Clear delineation between figure and background</li>
          <li>Front facing</li>
        </ul>
      </div>
      <Button
        variant="outline"
        className="mt-auto mb-0 w-full border-mira-purple text-mira-purple font-medium hover:bg-mira-purple/10 py-2"
        type="button"
        onClick={() => alert('Photo tips and guidance coming soon!')}
      >
        Help me take my Avatar Photo
      </Button>
      <div className="flex gap-2 w-full mt-4 justify-between">
        <Button
          className="py-2 px-4 rounded bg-gray-100 border text-gray-700 flex-1 shadow hover:bg-gray-200"
          variant="outline"
          onClick={onBack}
          disabled={isUploading || isGenerating}
        >
          Back
        </Button>
        <Button
          className="py-2 px-4 rounded bg-mira-purple text-white font-semibold flex-1 shadow hover:bg-mira-pink transition"
          onClick={handleCreateAvatar}
          disabled={!file || isUploading || isGenerating}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};