// Modified version of your Deno Edge Function for Supabase
// Updated to use the correct model for image generation/modification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to convert Blob to base64
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64) {
  // Remove data URL prefix if present
  const base64String = base64.split(',')[1] || base64;
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

    // Initialize Google Generative AI with API key
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

    // Parse request body
    const { imageUrl, userId } = await req.json()

    if (!imageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing avatar generation for user:', userId)
    console.log('Image URL:', imageUrl)

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

    // Convert image to base64 for Gemini API
    const imageBase64 = await blobToBase64(fileData)
    console.log('Image converted to base64')

    try {
      // For image editing using the proper approach with the @google/generative-ai package
      // Option 1: Using the ImageModel directly (if supported in your SDK version)
      const imageModel = genAI.getImageGenerationModel({
        model: "imagen-3.0-generate-001" // Correct model name for imagen in latest SDK 
      });
      
      // Create the prompt for background removal and standardization
      const prompt = `
        Transform this photo into a professional avatar with the following specifications:
        1. Remove the background completely
        2. Replace with a clean, light neutral gradient background (white or light grey)
        3. Ensure the person remains clear and centered in the frame
        4. Frame the image as a professional headshot showing head and shoulders
        5. Maintain natural skin tones and realistic appearance
        6. Ensure good lighting and clarity
        7. Output as a high-quality image suitable for a profile picture
        8. Do not add any text, watermarks, or additional elements
      `;

      console.log('Using Imagen for avatar generation with prompt:', prompt);

      // Process the image 
      const result = await imageModel.generateImages({
        prompt: prompt,
        inputImage: {
          inlineData: {
            data: imageBase64.split(',')[1], // Remove the data URL prefix
            mimeType: "image/jpeg"
          }
        },
        outputImageFormat: "png", 
        aspectRatio: "1:1"
      });
      
      console.log('Imagen response received');
      
      // Get the generated image data
      if (!result.images || result.images.length === 0) {
        throw new Error('No images were generated');
      }
      
      const imageData = result.images[0].data;
      console.log('Generated image data extracted');
      
      // Convert base64 to Uint8Array for storage
      const avatarBuffer = base64ToUint8Array(imageData);

      // Define paths for storing the avatar
      const userFolder = `user-${userId}`
      const avatarFileName = `${Date.now()}.png`
      const avatarPath = `${userFolder}/${avatarFileName}`
      
      // Upload the generated avatar to the avatars bucket
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(avatarPath, avatarBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        throw uploadError
      }

      console.log('Generated avatar uploaded successfully')

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
    } catch (genAIError) {
      console.error('Image generation API error:', genAIError)
      return new Response(
        JSON.stringify({ 
          error: 'Image generation API error', 
          details: genAIError.message || String(genAIError)
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Avatar generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})