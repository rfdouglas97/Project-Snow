
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { FaUpload, FaImage } from "react-icons/fa";

export const FileUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    setIsUploading(true);
    try {
      // This would connect to our Flask backend in a real implementation
      toast({
        title: "Supabase Integration Required",
        description: "Please connect your project to Supabase to enable file uploads.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <label htmlFor="image" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select Image
        </label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="cursor-pointer"
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
      
      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>Uploading...</>
        ) : (
          <>
            <FaUpload className="h-4 w-4" />
            Upload Image
          </>
        )}
      </Button>
      
      <div className="text-center pt-2">
        <p className="text-sm text-gray-500">
          Requires Supabase integration for actual implementation
        </p>
      </div>
    </div>
  );
};
