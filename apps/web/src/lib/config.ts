type AppConfig = {
  API_BASE_URL: string;
};

let configPromise: Promise<AppConfig> | null = null;

export function loadConfig() {
  if (!configPromise) {
    configPromise = fetch('/config.json').then((res) => res.json());
  }
  return configPromise;
}

export async function getApiBaseUrl() {
  const config = await loadConfig();
  return config.API_BASE_URL.replace(/\/$/, '');
}

/**
 * Get the WebSocket base URL for Socket.IO connections.
 * For development, this returns the full URL with protocol and host.
 * For production, it returns the API base URL (which will be proxied).
 */
export async function getWebSocketBaseUrl() {
  const config = await loadConfig();
  const apiUrl = config.API_BASE_URL.replace(/\/$/, '');
  
  // If API_BASE_URL is a relative path (like /api), construct full URL for WebSocket
  if (apiUrl.startsWith('/')) {
    // In development, use the actual backend server URL
    // Socket.IO needs a full URL with protocol for WebSocket connections
    const isDev = import.meta.env.DEV;
    if (isDev) {
      // Use the same host as the current page, but port 3000 (API server)
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3000`;
    }
  }
  
  // For production or absolute URLs, return as-is
  return apiUrl;
}

