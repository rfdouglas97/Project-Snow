
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    
    // Manually check if image size exceeds limits
    if (imageMetadata.width * imageMetadata.height > MAX_PIXELS) {
      console.log('Image is too large, need to resize or use original');
      
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

      // Store metadata in user_avatars table - without the is_ai_generated field
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

      console.log('Fallback avatar stored at:', publicUrl);

      return new Response(
        JSON.stringify({ 
          avatarUrl: publicUrl,
          avatarId: metadataData?.[0]?.id,
          note: "Using original image as avatar due to size limitations"
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Send the image to Stability AI for processing
    console.log('Calling Stability API for image generation');
    
    // Create FormData for the API request
    const formData = new FormData();
    
    // Add the image file to the FormData
    formData.append('init_image', imageBlob, 'input.png');
    
    // Add the required parameters
    formData.append('text_prompts[0][text]', 'Generate a professional profile avatar. Remove the original background completely. Place the person centered on a solid white background. Keep face, hairstyle, and clothing as in the original. Make it look professional and clean.');
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
      
      // Fall back to using the original image as the avatar
      console.log('Falling back to using the original image as avatar');
      
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

      // Store metadata in user_avatars table - without the is_ai_generated field
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

    // Store metadata in user_avatars table - without the is_ai_generated field
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
        avatarId: metadataData?.[0]?.id
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
      // This is a very simple implementation - in reality we would need more complex parsing
      // For now, let's return a safe estimate
      console.log('JPEG detected, using safe dimensions estimate');
      return {
        width: 2000,
        height: 2000,
        format: 'jpeg'
      };
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
    
    // If we can't determine, return a conservative estimate
    console.log('Image format not recognized, using maximum dimensions');
    return {
      width: 2000,
      height: 2000,
      format: 'unknown'
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    // Return conservative dimensions that will trigger the size check
    return {
      width: 2000,
      height: 2000,
      format: 'error'
    };
  }
}
