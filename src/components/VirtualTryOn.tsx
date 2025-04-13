
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Image, RefreshCw, Share2, Download, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function VirtualTryOn() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setImageUrl("");
    
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

  // Handle URL input
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setFile(null);
    setPreviewUrl(null);
  };

  // Fetch user's avatar
  const fetchUserAvatar = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the try-on feature",
          variant: "destructive",
        });
        return false;
      }

      // Get user's latest avatar from storage
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('avatars')
        .list(`user-${user.id}`, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (storageError || !storageData || storageData.length === 0) {
        toast({
          title: "No avatar found",
          description: "Please create an avatar first in the Avatar Generator",
          variant: "destructive",
        });
        return false;
      }

      // Get public URL of the avatar
      const avatarPath = storageData[0].name;
      const avatarUrl = supabase.storage
        .from('avatars')
        .getPublicUrl(`user-${user.id}/${avatarPath}`).data.publicUrl;

      setUserAvatar(avatarUrl);
      return true;
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      toast({
        title: "Error fetching avatar",
        description: "Could not retrieve your avatar image",
        variant: "destructive",
      });
      return false;
    }
  };

  // Upload file to Supabase storage
  const uploadFileToStorage = async () => {
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
          description: "Please sign in to upload an image",
          variant: "destructive",
        });
        clearInterval(progressInterval);
        setIsUploading(false);
        return null;
      }

      let productImageUrl;

      if (file) {
        // Upload file to product_images bucket
        const fileName = `user-${user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product_images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL of uploaded file
        productImageUrl = supabase.storage
          .from('product_images')
          .getPublicUrl(fileName).data.publicUrl;
      } else if (imageUrl) {
        // Use the URL directly
        productImageUrl = imageUrl;
      } else {
        throw new Error("No image source provided");
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      return productImageUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "There was an error uploading your image",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Generate try-on image
  const generateTryOn = async () => {
    // First check if we already have the user avatar, if not fetch it
    if (!userAvatar) {
      const hasAvatar = await fetchUserAvatar();
      if (!hasAvatar) return;
    }

    // Upload the product image
    const productImageUrl = await uploadFileToStorage();
    if (!productImageUrl) return;

    setIsProcessing(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the edge function to generate the try-on image
      const { data, error } = await supabase.functions.invoke('generate-try-on', {
        body: { 
          avatarUrl: userAvatar,
          productImageUrl: productImageUrl,
          userId: user.id
        }
      });

      if (error) {
        throw error;
      }

      // Set the try-on image URL
      setTryOnImage(data.tryOnImageUrl);
      
      toast({
        title: "Try-on complete",
        description: "Your virtual fitting is ready to view",
      });
    } catch (error) {
      console.error("Error during try-on generation:", error);
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating your try-on image",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (tryOnImage) {
      // Create an anchor element and trigger download
      const link = document.createElement('a');
      link.href = tryOnImage;
      link.download = `try-on-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Image saved",
        description: "Your try-on image has been saved",
      });
    }
  };

  // Handle share
  const handleShare = () => {
    if (tryOnImage && navigator.share) {
      navigator.share({
        title: "Virtual Try-On with Mira",
        text: "Check out how I look in this outfit!",
        url: tryOnImage,
      })
      .then(() => {
        toast({
          title: "Shared successfully",
          description: "Your image has been shared",
        });
      })
      .catch((error) => {
        console.error("Error sharing:", error);
        toast({
          title: "Sharing failed",
          description: "Could not share your image",
          variant: "destructive",
        });
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(tryOnImage || "");
      toast({
        title: "Link copied",
        description: "Image link copied to clipboard",
      });
    }
  };

  // Regenerate try-on image
  const handleRegenerate = () => {
    setTryOnImage(null);
    generateTryOn();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left side - Input */}
      <div className="space-y-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
            <TabsTrigger value="url">Image URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="product-image" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Upload Item to Try On
              </label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={isUploading || isProcessing}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="product-url" className="text-sm font-medium leading-none">
                Image URL to Try On
              </label>
              <div className="flex gap-2">
                <Input
                  id="product-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={handleUrlChange}
                  disabled={isUploading || isProcessing}
                />
                {imageUrl && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setPreviewUrl(imageUrl)}
                    disabled={isUploading || isProcessing}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {previewUrl && (
          <div className="rounded-md overflow-hidden border w-full h-48 flex items-center justify-center">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="object-contain h-full"
            />
          </div>
        )}
        
        {(isUploading || isProcessing) && (
          <div className="space-y-2">
            {isUploading && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Uploading...</span>
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </>
            )}
            
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-center">GPT-4o is generating your virtual try-on...</p>
                <p className="text-xs text-center text-muted-foreground mt-1">This may take up to 30 seconds</p>
              </div>
            )}
          </div>
        )}
        
        <Button
          onClick={generateTryOn}
          disabled={(!file && !imageUrl) || isUploading || isProcessing}
          className="w-full bg-gradient-primary hover:shadow-md transition-shadow duration-300"
        >
          <Upload className="h-4 w-4 mr-2" />
          Try It On
        </Button>
      </div>
      
      {/* Right side - Output */}
      <div>
        {tryOnImage ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-2">
                <div className="overflow-hidden rounded-md">
                  <img 
                    src={tryOnImage} 
                    alt="Virtual try-on result" 
                    className="w-full h-auto object-cover rounded-md"
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownload}
                  className="border-mira-purple/30 text-mira-purple hover:bg-mira-purple/10"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleShare}
                  className="border-mira-purple/30 text-mira-purple hover:bg-mira-purple/10"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
              <Button 
                size="sm"
                onClick={handleRegenerate}
                disabled={isProcessing}
                className="bg-gradient-primary hover:shadow-md transition-shadow duration-300"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full border border-dashed rounded-md p-6 bg-gray-50">
            <Image className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-center text-gray-500">
              Your virtual try-on will appear here
            </p>
            <p className="text-center text-gray-400 text-sm mt-1">
              Upload a clothing item on the left to begin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
