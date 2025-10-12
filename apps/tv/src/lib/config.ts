export type TvConfig = {
  API_BASE_URL: string;
};

let configPromise: Promise<TvConfig> | null = null;

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
