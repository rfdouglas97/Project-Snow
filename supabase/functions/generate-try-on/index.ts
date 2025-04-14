
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
    const { avatarUrl, productImageUrl, userId, responseType = 'image/png', includeImageResponse = true } = await req.json()

    if (!avatarUrl || !productImageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing avatarUrl, productImageUrl, or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing try-on generation for user:', userId)
    console.log('Avatar URL:', avatarUrl)
    console.log('Product URL:', productImageUrl)
    console.log('Response type requested:', responseType)

    // Get Stability API key
    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY is not set')
    }

    // Download the avatar image
    const avatarResponse = await fetch(avatarUrl)
    if (!avatarResponse.ok) {
      throw new Error(`Failed to download avatar image: ${avatarResponse.statusText}`)
    }
    const avatarImage = await avatarResponse.arrayBuffer()
    
    // Download the product image
    const productResponse = await fetch(productImageUrl)
    if (!productResponse.ok) {
      throw new Error(`Failed to download product image: ${productResponse.statusText}`)
    }
    const productImage = await productResponse.arrayBuffer()
    
    // Resize images to meet Stability AI requirements
    console.log('Resizing avatar image to meet API requirements')
    const resizedAvatarData = await resizeImage(avatarImage)
    console.log('Avatar image resized successfully')
    
    console.log('Resizing product image to meet API requirements')
    const resizedProductData = await resizeImage(productImage)
    console.log('Product image resized successfully')
    
    // Convert images to base64 for debugging purposes
    const avatarBase64 = btoa(String.fromCharCode(...new Uint8Array(avatarImage)))
    const productBase64 = btoa(String.fromCharCode(...new Uint8Array(productImage)))

    console.log('Calling Stability API for image generation')
    
    // Call Stability API for image-to-image generation
    const formData = new FormData()
    formData.append('init_image', new Blob([resizedAvatarData], { type: 'image/png' }))
    formData.append('text_prompts[0][text]', `Generate a realistic image of the person in the photo wearing the clothing from this product: ${productImageUrl}. Keep the person's face and body proportions exactly the same, only change their outfit to match the product. Maintain a neutral background.`)
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', '8')
    formData.append('clip_guidance_preset', 'FAST_BLUE')
    formData.append('samples', '1')
    formData.append('steps', '30')
    
    // Using the appropriate endpoint for virtual try-on
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

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text()
      console.error('Stability API error response:', errorText)
      console.error('Stability API HTTP status:', stabilityResponse.status)
      throw new Error(`Stability API error: ${stabilityResponse.status} - ${errorText}`)
    }
    
    const stabilityData = await stabilityResponse.json()
    console.log('Stability API response status:', stabilityResponse.status)
    
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
    
    // Define paths for storing the try-on image
    const userFolder = `user-${userId}`
    const tryOnFileName = `${Date.now()}.${responseType.split('/')[1]}`
    const tryOnPath = `${userFolder}/${tryOnFileName}`
    
    // Upload the generated image to the try_ons bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('try_ons')
      .upload(tryOnPath, imageBlob, {
        contentType: responseType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading try-on image:', uploadError)
      throw uploadError
    }

    console.log('Try-on image uploaded successfully')

    // Get the public URL for the uploaded try-on image
    const { data: { publicUrl } } = supabase.storage
      .from('try_ons')
      .getPublicUrl(tryOnPath)

    // Store metadata in user_try_ons table
    const { data: metadataData, error: metadataError } = await supabase
      .from('user_try_ons')
      .insert({
        user_id: userId,
        avatar_image_path: avatarUrl,
        product_image_path: productImageUrl,
        try_on_image_path: `try_ons/${tryOnPath}`
      })
      .select()

    if (metadataError) {
      console.error('Error storing try-on metadata:', metadataError)
      throw metadataError
    }

    console.log('Try-on metadata stored successfully')
    console.log('Try-on image stored at:', publicUrl)

    const response = {
      tryOnImageUrl: publicUrl,
      tryOnId: metadataData?.[0]?.id
    }
    
    if (includeImageResponse) {
      response.imageBase64 = generatedImageBase64
    }

    return new Response(
      JSON.stringify(response), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Detailed error during try-on generation:', error)
    
    // If something fails during image generation, fall back to the original image
    try {
      // Extract information from the error to determine if we should fall back
      const shouldFallback = true // We'll always fall back for now
      
      if (shouldFallback) {
        console.log('Falling back to original avatar as try-on image')
        
        // Try to parse the original request again to get imageUrl and userId
        const { avatarUrl, userId, responseType = 'image/png' } = await req.json()
        
        // Initialize Supabase client
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') || '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        )
        
        // Download the original image
        const avatarResponse = await fetch(avatarUrl)
        if (!avatarResponse.ok) {
          throw new Error('Failed to download original image for fallback')
        }
        
        const avatarImage = await avatarResponse.arrayBuffer()
        
        // Define paths for storing the try-on image
        const userFolder = `user-${userId}`
        const tryOnFileName = `${Date.now()}-fallback.${responseType.split('/')[1]}`
        const tryOnPath = `${userFolder}/${tryOnFileName}`
        
        // Upload the original image as try-on image
        const { error: uploadError } = await supabase
          .storage
          .from('try_ons')
          .upload(tryOnPath, avatarImage, {
            contentType: responseType,
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        // Get the public URL for the uploaded try-on image
        const { data: { publicUrl } } = supabase.storage
          .from('try_ons')
          .getPublicUrl(tryOnPath)

        return new Response(
          JSON.stringify({ 
            tryOnImageUrl: publicUrl,
            isPlaceholder: true
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
