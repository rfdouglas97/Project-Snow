
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
    
    // Create resized image if dimensions exceed limits
    let processedImageBlob = imageBlob;
    let resizeApplied = false;
    
    if (imageMetadata.width * imageMetadata.height > MAX_PIXELS) {
      console.log('Image is too large, resizing before processing');
      
      try {
        // Convert Blob to base64 for processing
        const arrayBuffer = await imageBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        uint8Array.forEach(byte => {
          binaryString += String.fromCharCode(byte);
        });
        const base64Image = btoa(binaryString);
        
        // Calculate new dimensions while maintaining aspect ratio
        const aspectRatio = imageMetadata.width / imageMetadata.height;
        let newWidth, newHeight;
        
        if (aspectRatio > 1) {
          // Landscape orientation
          newWidth = Math.min(MAX_DIMENSION, imageMetadata.width);
          newHeight = Math.round(newWidth / aspectRatio);
        } else {
          // Portrait or square orientation
          newHeight = Math.min(MAX_DIMENSION, imageMetadata.height);
          newWidth = Math.round(newHeight * aspectRatio);
        }
        
        // Ensure dimensions will result in less than MAX_PIXELS
        while (newWidth * newHeight > MAX_PIXELS) {
          newWidth = Math.round(newWidth * 0.9);
          newHeight = Math.round(newHeight * 0.9);
        }
        
        console.log(`Resizing image to ${newWidth}x${newHeight}`);
        
        // Use external API to resize the image (since Deno doesn't have built-in image processing)
        const resizeResponse = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: `data:image/png;base64,${base64Image}`,
            upload_preset: 'ml_default',
            transformation: `c_fill,w_${newWidth},h_${newHeight}`,
          }),
        });
        
        if (!resizeResponse.ok) {
          throw new Error('Failed to resize image');
        }
        
        const resizeData = await resizeResponse.json();
        
        // Fetch the resized image
        const resizedImageResponse = await fetch(resizeData.secure_url);
        processedImageBlob = await resizedImageResponse.blob();
        resizeApplied = true;
        console.log('Image successfully resized');
      } catch (resizeError) {
        console.error('Error resizing image:', resizeError);
        // Continue with the original image if resizing fails
        console.log('Continuing with original image due to resize failure');
      }
    }
    
    // Prepare to send the (possibly resized) image to Stability AI for processing
    console.log('Calling Stability API for image generation');
    
    // Create FormData for the API request
    const formData = new FormData();
    
    // Add the image file to the FormData
    formData.append('init_image', processedImageBlob, 'input.png');
    
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          // Let fetch set the content-type automatically for FormData
        },
        body: formData
      }
    );

    console.log('Stability API raw response status:', stabilityResponse.status);
    console.log('Stability API response headers:', Object.fromEntries(stabilityResponse.headers.entries()));
    
    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      console.error('Stability API error response:', errorText);
      console.error('Stability API HTTP status:', stabilityResponse.status);
      
      // Fall back to using the original image as the avatar if API call fails
      console.log('Falling back to using the original image as avatar due to API failure');
      
      // Define paths for storing the avatar
      const userFolder = `user-${userId}`;
      const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`;
      const avatarPath = `${userFolder}/${avatarFileName}`;
      
      // Upload the original image as avatar
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(avatarPath, fileData, {
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

      // Store metadata in user_avatars table
      const { data: metadataData, error: metadataError } = await supabase
        .from('user_avatars')
        .insert({
          user_id: userId,
          original_image_path: `${bucketName}/${imagePath}`,
          avatar_image_path: `avatars/${avatarPath}`,
          is_ai_generated: false
        })
        .select();

      if (metadataError) {
        console.error('Error storing avatar metadata:', metadataError);
        throw metadataError;
      }

      console.log('Fallback avatar stored at:', publicUrl);

      return new Response(
        JSON.stringify({ 
          avatarUrl: publicUrl,
          avatarId: metadataData?.[0]?.id,
          note: "Using original image as avatar due to generation error"
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const stabilityData = await stabilityResponse.json();
    console.log('Stability API response:', JSON.stringify(stabilityData, null, 2));
    
    if (!stabilityData.artifacts || stabilityData.artifacts.length === 0) {
      console.error('No images generated by Stability AI');
      throw new Error('No images generated by Stability AI');
    }
    
    // Get the generated image
    const generatedImageBase64 = stabilityData.artifacts[0].base64;
    
    // Convert base64 to blob for upload
    const binaryData = atob(generatedImageBase64);
    const array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      array[i] = binaryData.charCodeAt(i);
    }
    const imageBlob2 = new Blob([array], { type: responseType });
    
    // Define paths for storing the avatar
    const userFolder = `user-${userId}`;
    const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`;
    const avatarPath = `${userFolder}/${avatarFileName}`;
    
    // Upload the generated image to the avatars bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(avatarPath, imageBlob2, {
        contentType: responseType,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      throw uploadError;
    }

    console.log('Avatar uploaded successfully');

    // Get the public URL for the uploaded avatar
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarPath);

    // Store metadata in user_avatars table
    const { data: metadataData, error: metadataError } = await supabase
      .from('user_avatars')
      .insert({
        user_id: userId,
        original_image_path: `${bucketName}/${imagePath}`,
        avatar_image_path: `avatars/${avatarPath}`,
        is_ai_generated: true
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
