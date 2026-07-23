import { streamingProviders, StreamingProvider } from './streamingProviders';

export type { StreamingProvider };

export const STREAMING_PROVIDERS = streamingProviders;

export function getProviderById(id: number): StreamingProvider | undefined {
  return streamingProviders.find((p) => p.id === id);
}

export { streamingProviders };
