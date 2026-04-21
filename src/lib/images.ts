/**
 * Utility to optimize images hosted on Supabase Storage using its built-in
 * image transformation service.
 */
export const getOptimizedImageUrl = (url: string | undefined, width = 600, height = 600) => {
  if (!url || typeof url !== 'string') return url;
  
  // Only transform if it's a Supabase storage URL
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    // Swap /object/ to /render/image/ and append transformation params
    return url.replace('/object/public/', '/render/image/public/') + `?width=${width}&height=${height}&resize=cover&quality=80`;
  }
  
  return url;
};
