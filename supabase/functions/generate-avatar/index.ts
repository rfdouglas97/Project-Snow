
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { decode as decodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Max dimensions for Stability AI API
const MAX_DIMENSION = 1024;
const MAX_PIXELS = 1048576; // 1024 * 1024

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Parse request body
    const { imageUrl, userId, responseType = 'image/png' } = await req.json()

    if (!imageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing avatar generation for user:', userId)
    console.log('Image URL:', imageUrl)
    console.log('Response type requested:', responseType)

    // Extract path from the imageUrl
    const urlParts = imageUrl.split('/storage/v1/object/public/')
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL format')
    }
    
    const pathParts = urlParts[1].split('/')
    const bucketName = pathParts[0]
    const imagePath = pathParts.slice(1).join('/')
    
    console.log('Extracted bucket name:', bucketName)
    console.log('Extracted image path:', imagePath)

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(bucketName)
      .download(imagePath)
    
    if (downloadError) {
      console.error('Error downloading file:', downloadError)
      throw downloadError
    }
    
    console.log('Original file downloaded successfully')
    
    // Get Stability API key
    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY is not set')
    }

    // Create a blob from the file data
    const imageBlob = new Blob([fileData], { type: 'image/png' });
    
    // Check image dimensions before sending to Stability AI
    const imageMetadata = await getImageMetadata(imageBlob);
    console.log('Image dimensions:', imageMetadata);
    
    // Check if image exceeds the maximum allowed pixels
    const totalPixels = imageMetadata.width * imageMetadata.height;
    if (totalPixels > MAX_PIXELS) {
      console.log(`Image too large (${totalPixels} pixels), resizing...`);
      
      // Calculate new dimensions while maintaining aspect ratio
      const aspectRatio = imageMetadata.width / imageMetadata.height;
      let newWidth, newHeight;
      
      if (aspectRatio > 1) {
        // Landscape orientation
        newWidth = Math.floor(Math.sqrt(MAX_PIXELS * aspectRatio));
        newHeight = Math.floor(newWidth / aspectRatio);
      } else {
        // Portrait or square orientation
        newHeight = Math.floor(Math.sqrt(MAX_PIXELS / aspectRatio));
        newWidth = Math.floor(newHeight * aspectRatio);
      }
      
      // Double-check our math to ensure we're under the limit
      while (newWidth * newHeight > MAX_PIXELS) {
        newWidth = Math.floor(newWidth * 0.95);
        newHeight = Math.floor(newHeight * 0.95);
      }
      
      console.log(`Resizing image to ${newWidth}x${newHeight}`);
      
      try {
        // Try using sharp for image resizing if available
        const processedImageBlob = await resizeImageManually(imageBlob, newWidth, newHeight);
        
        if (processedImageBlob) {
          console.log("Successfully resized image");
          
          // Use the resized image for the Stability API call
          const resizedImgMetadata = await getImageMetadata(processedImageBlob);
          console.log("Resized dimensions:", resizedImgMetadata);
          
          // Continue with the API call using the resized image
          const result = await processImageWithStabilityAI(processedImageBlob, STABILITY_API_KEY);
          
          if (result.success) {
            // Upload the generated image to the avatars bucket
            const generatedImageBlob = result.imageBlob;
            const userFolder = `user-${userId}`;
            const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`;
            const avatarPath = `${userFolder}/${avatarFileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from('avatars')
              .upload(avatarPath, generatedImageBlob, {
                contentType: responseType,
                upsert: true
              });
            
            if (uploadError) {
              console.error('Error uploading avatar:', uploadError);
              throw uploadError;
            }
            
            // Get the public URL for the uploaded avatar
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(avatarPath);
            
            // Try to store metadata with the is_ai_generated field - if it fails, catch and try without
            try {
              const { data: metadataData, error: metadataError } = await supabase
                .from('user_avatars')
                .insert({
                  user_id: userId,
                  original_image_path: `${bucketName}/${imagePath}`,
                  avatar_image_path: `avatars/${avatarPath}`
                })
                .select();
              
              if (metadataError) {
                console.error('Error storing avatar metadata:', metadataError);
                throw metadataError;
              }
              
              console.log('Avatar metadata stored successfully');
              console.log('Avatar stored at:', publicUrl);
              
              return new Response(
                JSON.stringify({ 
                  avatarUrl: publicUrl,
                  avatarId: metadataData?.[0]?.id,
                  is_ai_generated: true
                }), 
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } catch (metadataError) {
              console.error('Error with metadata, possibly missing is_ai_generated field:', metadataError);
              
              // Attempt fallback with basic metadata
              const { data: metadataData, error: fallbackError } = await supabase
                .from('user_avatars')
                .insert({
                  user_id: userId,
                  original_image_path: `${bucketName}/${imagePath}`,
                  avatar_image_path: `avatars/${avatarPath}`
                })
                .select();
              
              if (fallbackError) {
                console.error('Fallback metadata storage failed:', fallbackError);
                throw fallbackError;
              }
              
              return new Response(
                JSON.stringify({ 
                  avatarUrl: publicUrl,
                  avatarId: metadataData?.[0]?.id,
                  is_ai_generated: true
                }), 
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else {
            throw new Error(result.error || "Unknown error during image processing");
          }
        }
      } catch (resizeError) {
        console.error('Error during image resizing or processing:', resizeError);
        // If processing fails, we'll fall back to using the original image
      }
    }
    
    // If we've reached here, we either have a small enough image or resizing failed
    // Try to generate with the original image (if small enough) or use fallback
    try {
      const result = await processImageWithStabilityAI(imageBlob, STABILITY_API_KEY);
      
      if (result.success) {
        // Upload the generated image to the avatars bucket
        const generatedImageBlob = result.imageBlob;
        const userFolder = `user-${userId}`;
        const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`;
        const avatarPath = `${userFolder}/${avatarFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(avatarPath, generatedImageBlob, {
            contentType: responseType,
            upsert: true
          });
          
        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          throw uploadError;
        }
        
        // Get the public URL for the uploaded avatar
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(avatarPath);
        
        // Try to store metadata with the is_ai_generated field - if it fails, catch and try without
        try {
          const { data: metadataData, error: metadataError } = await supabase
            .from('user_avatars')
            .insert({
              user_id: userId,
              original_image_path: `${bucketName}/${imagePath}`,
              avatar_image_path: `avatars/${avatarPath}`
            })
            .select();
          
          if (metadataError) {
            console.error('Error storing avatar metadata:', metadataError);
            throw metadataError;
          }
          
          console.log('Avatar metadata stored successfully');
          console.log('Avatar stored at:', publicUrl);
          
          return new Response(
            JSON.stringify({ 
              avatarUrl: publicUrl,
              avatarId: metadataData?.[0]?.id,
              is_ai_generated: true
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (metadataError) {
          console.error('Error with metadata, possibly missing is_ai_generated field:', metadataError);
          
          // Attempt fallback with basic metadata
          const { data: metadataData, error: fallbackError } = await supabase
            .from('user_avatars')
            .insert({
              user_id: userId,
              original_image_path: `${bucketName}/${imagePath}`,
              avatar_image_path: `avatars/${avatarPath}`
            })
            .select();
          
          if (fallbackError) {
            console.error('Fallback metadata storage failed:', fallbackError);
            throw fallbackError;
          }
          
          return new Response(
            JSON.stringify({ 
              avatarUrl: publicUrl,
              avatarId: metadataData?.[0]?.id,
              is_ai_generated: true
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        throw new Error(result.error || "Unknown error during image processing");
      }
    } catch (processError) {
      console.error('Stability API processing error, falling back to original image:', processError);
      
      // FALLBACK: If the API call fails, use the original image as the avatar
      const userFolder = `user-${userId}`;
      const avatarFileName = `original-${Date.now()}.${responseType.split('/')[1]}`;
      const avatarPath = `${userFolder}/${avatarFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(avatarPath, fileData, {
          contentType: responseType,
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading original as avatar:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL for the uploaded avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarPath);
      
      // Try to store metadata with the is_ai_generated field - if it fails, catch and try without
      try {
        const { data: metadataData, error: metadataError } = await supabase
          .from('user_avatars')
          .insert({
            user_id: userId,
            original_image_path: `${bucketName}/${imagePath}`,
            avatar_image_path: `avatars/${avatarPath}`
          })
          .select();
        
        if (metadataError) {
          console.error('Error storing fallback avatar metadata:', metadataError);
          throw metadataError;
        }
        
        console.log('Fallback avatar stored at:', publicUrl);
        
        return new Response(
          JSON.stringify({ 
            avatarUrl: publicUrl,
            avatarId: metadataData?.[0]?.id,
            is_ai_generated: false,
            note: "Using original image as avatar due to generation error"
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (metadataError) {
        console.error('Error with metadata, possibly missing is_ai_generated field:', metadataError);
        
        // Attempt fallback with basic metadata
        const { data: metadataData, error: fallbackError } = await supabase
          .from('user_avatars')
          .insert({
            user_id: userId,
            original_image_path: `${bucketName}/${imagePath}`,
            avatar_image_path: `avatars/${avatarPath}`
          })
          .select();
        
        if (fallbackError) {
          console.error('Fallback metadata storage failed:', fallbackError);
          throw fallbackError;
        }
        
        return new Response(
          JSON.stringify({ 
            avatarUrl: publicUrl,
            avatarId: metadataData?.[0]?.id,
            is_ai_generated: false,
            note: "Using original image as avatar due to generation error"
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('Detailed error during avatar generation:', error);
    
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get image dimensions
async function getImageMetadata(imageBlob) {
  try {
    // We can't use the browser Image API in Deno
    // Instead, use ArrayBuffer to inspect the image header
    const arrayBuffer = await imageBlob.arrayBuffer();
    const array = new Uint8Array(arrayBuffer);
    
    // Check if it's a JPEG
    if (array[0] === 0xFF && array[1] === 0xD8) {
      return extractJpegDimensions(array);
    }
    
    // Check if it's a PNG
    if (array[0] === 0x89 && array[1] === 0x50 && array[2] === 0x4E && array[3] === 0x47) {
      // For PNG, dimensions are at a specific offset in the IHDR chunk
      const width = (array[16] << 24) | (array[17] << 16) | (array[18] << 8) | array[19];
      const height = (array[20] << 24) | (array[21] << 16) | (array[22] << 8) | array[23];
      
      console.log('PNG detected, dimensions:', width, 'x', height);
      return {
        width,
        height,
        format: 'png'
      };
    }
    
    // If we can't determine, return dimensions that will trigger resize
    console.log('Image format not recognized, assuming large dimensions');
    return {
      width: 1500,
      height: 1500,
      format: 'unknown'
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    // Return dimensions that will trigger resize
    return {
      width: 1500,
      height: 1500,
      format: 'error'
    };
  }
}

// Helper function to extract JPEG dimensions
function extractJpegDimensions(data) {
  try {
    let offset = 2; // Skip JPEG header
    
    while (offset < data.length) {
      // Check for the Start Of Frame marker (0xFFC0 to 0xFFC3)
      if (data[offset] === 0xFF && (data[offset + 1] >= 0xC0 && data[offset + 1] <= 0xC3)) {
        // Height is at offset+5 (2 bytes), width is at offset+7 (2 bytes)
        const height = (data[offset + 5] << 8) | data[offset + 6];
        const width = (data[offset + 7] << 8) | data[offset + 8];
        
        console.log('JPEG detected, dimensions:', width, 'x', height);
        return {
          width,
          height,
          format: 'jpeg'
        };
      }
      
      // Move to the next marker
      if (data[offset] === 0xFF && data[offset + 1] !== 0x00) {
        const length = (data[offset + 2] << 8) | data[offset + 3];
        offset += 2 + length;
      } else {
        // Skip this byte
        offset += 1;
      }
      
      // Safety check to prevent infinite loop
      if (offset > 1000) {
        break;
      }
    }
    
    // If we couldn't find dimensions, return safe estimates
    console.log('JPEG dimensions not found, using safe estimate');
    return {
      width: 1500,
      height: 1500,
      format: 'jpeg'
    };
  } catch (error) {
    console.error('Error extracting JPEG dimensions:', error);
    return {
      width: 1500,
      height: 1500,
      format: 'jpeg'
    };
  }
}

// Function to resize image manually
async function resizeImageManually(imageBlob, targetWidth, targetHeight) {
  try {
    // Convert blob to base64
    const arrayBuffer = await imageBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    // Create a very simple query to a public image processing service
    // Note: In production, you would want to use a more reliable service
    const response = await fetch(`https://wsrv.nl/?url=data:${imageBlob.type};base64,${base64}&w=${targetWidth}&h=${targetHeight}&fit=inside&output=webp`);
    
    if (!response.ok) {
      throw new Error(`Image resize service returned ${response.status}: ${response.statusText}`);
    }
    
    // Get the resized image as a blob
    const resizedBlob = await response.blob();
    return resizedBlob;
  } catch (error) {
    console.error("Manual image resize failed:", error);
    return null;
  }
}

// Function to process image with Stability AI
async function processImageWithStabilityAI(imageBlob, apiKey) {
  try {
    // Create FormData for the API request
    const formData = new FormData();
    
    // Add the image file to the FormData
    formData.append('init_image', imageBlob);
    
    // Add the required parameters
    formData.append('text_prompts[0][text]', 'Generate a professional profile avatar with a clean, simple background. Focus on the face, make it a professional headshot. Keep facial features accurate. Remove all background noise and distractions. Maintain natural skin tones and lighting.');
    formData.append('text_prompts[0][weight]', '1');
    formData.append('cfg_scale', '7');
    formData.append('clip_guidance_preset', 'FAST_BLUE');
    formData.append('samples', '1');
    formData.append('steps', '30');
    formData.append('style_preset', 'photographic');
    formData.append('image_strength', '0.6');
    
    // Make the API call to Stability AI
    const stabilityResponse = await fetch(
      'https://api.stability.ai/v1/generation/stable-image-core-1-0-b/image-to-image', 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          // Let fetch set the content-type automatically for FormData
        },
        body: formData
      }
    );
    
    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      console.error('Stability API error response:', errorText);
      console.error('Stability API HTTP status:', stabilityResponse.status);
      return { 
        success: false, 
        error: `API Error: ${stabilityResponse.status} - ${errorText}`
      };
    }
    
    const stabilityData = await stabilityResponse.json();
    
    if (!stabilityData.artifacts || stabilityData.artifacts.length === 0) {
      return { success: false, error: 'No images generated by Stability AI' };
    }
    
    // Get the generated image
    const generatedImageBase64 = stabilityData.artifacts[0].base64;
    
    // Convert base64 to blob for upload
    const binaryData = atob(generatedImageBase64);
    const array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      array[i] = binaryData.charCodeAt(i);
    }
    const resultBlob = new Blob([array], { type: 'image/png' });
    
    return { success: true, imageBlob: resultBlob };
  } catch (error) {
    console.error('Error processing image with Stability AI:', error);
    return { success: false, error: error.message };
  }
}
