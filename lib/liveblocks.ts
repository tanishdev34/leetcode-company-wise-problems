// Liveblocks configuration
// Get your keys from https://liveblocks.io/dashboard/apikeys
// For development, use publicApiKey. For production, use authEndpoint.

export const liveblocksConfig = {
  // Use public key for development (no auth endpoint needed)
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY || "",
  // For production, switch to:
  // authEndpoint: "/api/liveblocks/auth",
}
