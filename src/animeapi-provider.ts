import { NoSuchModelError, type ImageModelV4, type ProviderV4 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash, type FetchFunction } from "@ai-sdk/provider-utils";
import { AnimeAPIImageModel, type AnimeAPIImageModelId } from "./animeapi-image-model";

declare const __PACKAGE_VERSION__: string;
export const VERSION: string = typeof __PACKAGE_VERSION__ === "string" ? __PACKAGE_VERSION__ : "0.0.0-dev";

export interface AnimeAPIProviderSettings {
  /** API key (starts with `ank_`). Defaults to the `ANIMEAPI_KEY` environment variable. */
  apiKey?: string;
  /** Defaults to `https://animeapi.ai`. */
  baseURL?: string;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Custom fetch, e.g. for a proxy. */
  fetch?: FetchFunction;
}

export interface AnimeAPIProvider extends ProviderV4 {
  /** Image model: `anime` ($0.003 per image), `ultra` ($0.01) or `ultra-max` ($0.02). */
  image(modelId: AnimeAPIImageModelId): ImageModelV4;
  imageModel(modelId: AnimeAPIImageModelId): ImageModelV4;
}

export function createAnimeAPI(options: AnimeAPIProviderSettings = {}): AnimeAPIProvider {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? "https://animeapi.ai";
  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "ANIMEAPI_KEY",
      description: "AnimeAPI",
    })}`,
    "User-Agent": `animeapi-ai-sdk-provider/${VERSION}`,
    ...options.headers,
  });

  const createImageModel = (modelId: AnimeAPIImageModelId) =>
    new AnimeAPIImageModel(modelId, { provider: "animeapi.image", baseURL, headers: getHeaders, fetch: options.fetch });

  return {
    specificationVersion: "v4",
    image: createImageModel,
    imageModel: createImageModel,
    languageModel: (modelId: string) => {
      throw new NoSuchModelError({ modelId, modelType: "languageModel" });
    },
    embeddingModel: (modelId: string) => {
      throw new NoSuchModelError({ modelId, modelType: "embeddingModel" });
    },
  };
}

/** Default provider instance; reads the key from `ANIMEAPI_KEY`. */
export const animeapi: AnimeAPIProvider = createAnimeAPI();
