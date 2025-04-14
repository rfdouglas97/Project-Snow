
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

    // Resize the image if needed to fit within Stability API limits
    const resizedImageData = await resizeImageIfNeeded(fileData);
    
    // Send the image to Stability AI for processing
    console.log('Calling Stability API for image generation')
    
    // Create FormData for the API request
    const formData = new FormData()
    
    // Add the image file with the correct parameter name
    formData.append('init_image', new Blob([resizedImageData], { type: 'image/png' }), 'input.png')
    
    // Add the required parameters
    formData.append('text_prompts[0][text]', 'Remove the original background completely. Place the person centered on a solid white background. Do NOT modify face, hairstyle, or body proportions at all. Keep clothing neutral-colored. Standardize pose to standing straight, facing forward, neutral expression, portrait orientation, full body visible head-to-toe.')
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', '7')
    formData.append('clip_guidance_preset', 'FAST_BLUE')
    formData.append('samples', '1')
    formData.append('steps', '30')
    formData.append('style_preset', 'photographic')
    formData.append('image_strength', '0.65') // Adjust balance between input image and prompt
    
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
    )

    console.log('Stability API raw response status:', stabilityResponse.status)
    console.log('Stability API response headers:', Object.fromEntries(stabilityResponse.headers.entries()))
    
    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text()
      console.error('Stability API error response:', errorText)
      console.error('Stability API HTTP status:', stabilityResponse.status)
      
      // Fall back to using the original image as the avatar
      console.log('Falling back to using the original image as avatar')
      
      // Define paths for storing the avatar
      const userFolder = `user-${userId}`
      const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`
      const avatarPath = `${userFolder}/${avatarFileName}`
      
      // Upload the original image as avatar
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(avatarPath, fileData, {
          contentType: responseType,
          upsert: true
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        throw uploadError
      }

      // Get the public URL for the uploaded avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarPath)

      // Store metadata in user_avatars table
      const { data: metadataData, error: metadataError } = await supabase
        .from('user_avatars')
        .insert({
          user_id: userId,
          original_image_path: `${bucketName}/${imagePath}`,
          avatar_image_path: `avatars/${avatarPath}`,
          is_ai_generated: false
        })
        .select()

      if (metadataError) {
        console.error('Error storing avatar metadata:', metadataError)
        throw metadataError
      }

      console.log('Fallback avatar stored at:', publicUrl)

      return new Response(
        JSON.stringify({ 
          avatarUrl: publicUrl,
          avatarId: metadataData?.[0]?.id,
          note: "Using original image as avatar due to generation error"
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const stabilityData = await stabilityResponse.json()
    console.log('Stability API response:', JSON.stringify(stabilityData, null, 2))
    
    if (!stabilityData.artifacts || stabilityData.artifacts.length === 0) {
      console.error('No images generated by Stability AI')
      throw new Error('No images generated by Stability AI')
    }
    
    // Get the generated image
    const generatedImageBase64 = stabilityData.artifacts[0].base64
    
    // Convert base64 to blob for upload
    const binaryData = atob(generatedImageBase64)
    const array = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      array[i] = binaryData.charCodeAt(i)
    }
    const imageBlob = new Blob([array], { type: responseType })
    
    // Define paths for storing the avatar
    const userFolder = `user-${userId}`
    const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`
    const avatarPath = `${userFolder}/${avatarFileName}`
    
    // Upload the generated image to the avatars bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(avatarPath, imageBlob, {
        contentType: responseType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      throw uploadError
    }

    console.log('Avatar uploaded successfully')

    // Get the public URL for the uploaded avatar
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarPath)

    // Store metadata in user_avatars table
    const { data: metadataData, error: metadataError } = await supabase
      .from('user_avatars')
      .insert({
        user_id: userId,
        original_image_path: `${bucketName}/${imagePath}`,
        avatar_image_path: `avatars/${avatarPath}`,
        is_ai_generated: true
      })
      .select()

    if (metadataError) {
      console.error('Error storing avatar metadata:', metadataError)
      throw metadataError
    }

    console.log('Avatar metadata stored successfully')
    console.log('Avatar stored at:', publicUrl)

    return new Response(
      JSON.stringify({ 
        avatarUrl: publicUrl,
        avatarId: metadataData?.[0]?.id
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Detailed error during avatar generation:', error)
    
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to resize image if needed to comply with Stability AI size limits
async function resizeImageIfNeeded(imageData: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // Convert ArrayBuffer to base64 for creating an image object
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
    const img = new Image();
    
    // Wait for the image to load
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = `data:image/png;base64,${base64}`;
    });
    
    // Check if resizing is needed
    let width = img.width;
    let height = img.height;
    const totalPixels = width * height;
    
    if (width > MAX_DIMENSION || height > MAX_DIMENSION || totalPixels > MAX_PIXELS) {
      console.log(`Image needs resizing. Original dimensions: ${width}x${height}, pixels: ${totalPixels}`);
      
      // Calculate new dimensions
      if (totalPixels > MAX_PIXELS) {
        const scale = Math.sqrt(MAX_PIXELS / totalPixels);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
      
      if (width > MAX_DIMENSION) {
        height = Math.floor(height * (MAX_DIMENSION / width));
        width = MAX_DIMENSION;
      }
      
      if (height > MAX_DIMENSION) {
        width = Math.floor(width * (MAX_DIMENSION / height));
        height = MAX_DIMENSION;
      }
      
      console.log(`Resizing to: ${width}x${height}`);
      
      // Create canvas for resizing
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Draw resized image on canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas to blob
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      
      // Convert blob to ArrayBuffer
      return await blob.arrayBuffer();
    }
    
    // No resizing needed
    console.log('Image does not need resizing');
    return imageData;
  } catch (error) {
    console.error('Error resizing image:', error);
    // Return original data if resizing fails
    return imageData;
  }
}
