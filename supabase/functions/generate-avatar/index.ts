
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Max dimensions for Stability AI API (max pixels: 1,048,576 = 1024x1024)
const MAX_DIMENSION = 1024;

// Function to resize an image to meet max pixel requirements
async function resizeImage(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  const imgBlob = new Blob([imageBuffer], { type: 'image/png' });
  const imgUrl = URL.createObjectURL(imgBlob);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      const pixelCount = width * height;
      
      if (pixelCount > MAX_DIMENSION * MAX_DIMENSION) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = MAX_DIMENSION;
          height = Math.round(width / aspectRatio);
        } else {
          height = MAX_DIMENSION;
          width = Math.round(height * aspectRatio);
        }
        
        console.log(`Resizing image from ${img.width}x${img.height} to ${width}x${height}`);
      } else {
        console.log(`Image is already within size limits: ${width}x${height}`);
      }
      
      // Create canvas for resizing
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw the image to the canvas with new dimensions
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas to blob
      canvas.convertToBlob({ type: 'image/png' }).then(blob => {
        // Convert blob to array buffer
        blob.arrayBuffer().then(buffer => {
          resolve(new Uint8Array(buffer));
          URL.revokeObjectURL(imgUrl);
        }).catch(reject);
      }).catch(reject);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
      URL.revokeObjectURL(imgUrl);
    };
    
    img.src = imgUrl;
  });
}

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
    
    // Resize the image to meet Stability AI's requirements
    console.log('Resizing image to meet API requirements')
    const resizedImageData = await resizeImage(fileData)
    console.log('Image resized successfully')
    
    // Get Stability API key
    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY is not set')
    }

    // Send the image to Stability AI for processing
    console.log('Calling Stability API for image generation')
    
    const formData = new FormData()
    formData.append('init_image', new Blob([resizedImageData], { type: 'image/png' }))
    formData.append('text_prompts[0][text]', 'based on the input photo, take the figure in the image, do not modify the face or body at all, and place the figure centered against a white / light grey background. Standardize the pose to be standing straight, facing forward with a neutral expression. Use neutral colored clothing. The image should be in a portrait orientation and include the full body from head to toe.')
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', '7')
    formData.append('clip_guidance_preset', 'FAST_BLUE')
    formData.append('samples', '1')
    formData.append('steps', '30')
    
    const stabilityResponse = await fetch(
      'https://api.stability.ai/v1/generation/stable-image-core-1-0-b/image-to-image', 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
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
      throw new Error(`Stability API error: ${stabilityResponse.status} - ${errorText}`)
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
        avatar_image_path: `avatars/${avatarPath}`
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
    
    // If something fails during image generation, we'll fall back to the original image
    try {
      // Extract information from the error to determine if we should fall back
      const shouldFallback = true // We'll always fall back for now
      
      if (shouldFallback) {
        console.log('Falling back to original image as avatar')
        
        // Try to parse the original request again to get imageUrl and userId
        const { imageUrl, userId, responseType = 'image/png' } = await req.json()
        
        // Extract path from the imageUrl again
        const urlParts = imageUrl.split('/storage/v1/object/public/')
        const pathParts = urlParts[1].split('/')
        const bucketName = pathParts[0]
        const imagePath = pathParts.slice(1).join('/')
        
        // Download the original image
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') || '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        )
        
        const { data: fileData } = await supabase
          .storage
          .from(bucketName)
          .download(imagePath)
        
        if (!fileData) {
          throw new Error('Failed to download original image for fallback')
        }
        
        // Define paths for storing the avatar
        const userFolder = `user-${userId}`
        const avatarFileName = `${Date.now()}.${responseType.split('/')[1]}`
        const avatarPath = `${userFolder}/${avatarFileName}`
        
        // Upload the original image as avatar
        const { error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(avatarPath, fileData, {
            contentType: responseType,
            upsert: true
          })

        if (uploadError) {
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
            avatar_image_path: `avatars/${avatarPath}`
          })
          .select()

        if (metadataError) {
          throw metadataError
        }

        return new Response(
          JSON.stringify({ 
            avatarUrl: publicUrl,
            avatarId: metadataData?.[0]?.id,
            note: "Using original image as avatar due to generation error"
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (fallbackError) {
      console.error('Error in fallback logic:', fallbackError)
    }
    
    // If we get here, both the main flow and fallback have failed
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
