// API Configuration
// Uses environment variables to switch between local and production endpoints

const getApiUrl = () => {
  // Check for explicit API URL in environment (VITE_ prefix required for Vite)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check mode - production mode uses ngrok, development uses localhost
  if (import.meta.env.MODE === 'production' || import.meta.env.PROD) {
    return 'https://trueclaimbackend.ngrok.app';
  }
  
  // Development mode - use localhost by default
  // You can override this by creating a .env.local file with:
  // VITE_API_URL=http://localhost:3000
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiUrl();

// Helper function to build API URLs
export const apiUrl = (endpoint: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Log the API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', API_BASE_URL);
  console.log('🔧 Mode:', import.meta.env.MODE);
  console.log('💡 To use ngrok, set VITE_API_URL=https://trueclaimbackend.ngrok.app in .env.local');
}
