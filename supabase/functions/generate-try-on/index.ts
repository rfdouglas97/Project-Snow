
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to fetch image and convert to base64
async function imageUrlToBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL ${url}: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  return blobToBase64(blob);
}

// Helper function to convert Blob to base64
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:' + blob.type + ';base64,' + btoa(binary);
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

// Helper function to ensure buckets exist
async function ensureBucketsExist(supabase) {
  const requiredBuckets = ['avatars', 'product_images'];
  
  for (const bucketName of requiredBuckets) {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking for bucket ${bucketName}:`, listError);
      continue;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
      } else {
        console.log(`Successfully created bucket: ${bucketName}`);
      }
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Received request to generate-try-on function");
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Ensure required buckets exist
    await ensureBucketsExist(supabase);

    // Initialize Google Generative AI with API key
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);

    // Parse request body
    const { avatarUrl, productImageUrl, userId } = await req.json();

    if (!avatarUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: avatarUrl' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!productImageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: productImageUrl' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Processing try-on request:", { avatarUrl, productImageUrl });

    try {
      // Convert both images to base64
      console.log("Converting avatar image to base64");
      const avatarBase64 = await imageUrlToBase64(avatarUrl);
      
      console.log("Converting product image to base64");
      const productBase64 = await imageUrlToBase64(productImageUrl);
      
      // Get the Gemini model for image generation
      // Using the latest Gemini model suitable for image generation
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp-image-generation"
      });
      
      console.log("Using Gemini 2.0 Flash model for try-on generation");
      
      // Craft a precise prompt that ensures no modification of facial features
      const prompt = `
        Task: Create a realistic virtual try-on image where the person from the first image is wearing the clothing item from the second image.
        
        IMPORTANT REQUIREMENTS:
        - PRESERVE: The person's face, hair, skin tone, and body proportions MUST remain exactly as they are in the first image
        - DO NOT: Change facial features, expressions, hairstyle, body shape, or add accessories that aren't in the original images
        - DO NOT: Make the person thinner, taller, or modify any physical attributes
        - ONLY: Make the clothing item from the second image appear to be worn by the person in the first image
        - MAINTAIN: The lighting, background and overall composition of the first image
        - ENSURE: The clothing appears natural and properly fitted to the person's body
        
        The final image must look like the exact same person wearing the new clothing item with absolutely no modifications to their physical appearance.
        
        Output a high-quality, photorealistic image.
      `;

      console.log("Sending request to Gemini with prompt:", prompt);

      // Process the images with the model
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: {
                mimeType: "image/jpeg",
                data: avatarBase64.split(',')[1] // Avatar image (person)
              }
            },
            { inlineData: {
                mimeType: "image/jpeg",
                data: productBase64.split(',')[1] // Product image (clothing)
              }
            }
          ]
        }],
        // Enable image generation in the response
        generationConfig: {
          responseModalities: ["Text", "Image"]
        }
      });
      
      console.log('Received response from Gemini API');
      
      const response = await result.response;
      
      // Find the image part in the response
      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        part => part.inlineData && part.inlineData.mimeType.startsWith('image/')
      );
      
      if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        console.error('Response structure:', JSON.stringify(response.candidates?.[0]?.content?.parts));
        throw new Error('No image data found in Gemini response');
      }
      
      const imageData = imagePart.inlineData.data;
      console.log('Successfully extracted generated image data');
      
      // Convert base64 to Uint8Array for storage
      const tryOnBuffer = base64ToUint8Array(imageData);

      // Define path for storing the try-on image
      const tryOnFileName = `try-on-${userId}-${Date.now()}.png`;
      const tryOnPath = `try-ons/${tryOnFileName}`;
      
      console.log(`Uploading try-on image to storage at path: ${tryOnPath}`);
      
      // Upload the generated try-on image to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(tryOnPath, tryOnBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading try-on image:', uploadError);
        throw uploadError;
      }

      console.log('Try-on image uploaded successfully');

      // Get the public URL for the uploaded try-on image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(tryOnPath);

      console.log("Try-on image stored at:", publicUrl);

      return new Response(
        JSON.stringify({ 
          tryOnImageUrl: publicUrl 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (genAIError) {
      console.error('Gemini API error:', genAIError);
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API error', 
          details: genAIError.message || String(genAIError)
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Try-on generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Try-on generation error', 
        details: error.message || String(error) 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
