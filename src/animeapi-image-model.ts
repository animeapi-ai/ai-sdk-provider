import type { ImageModelV4, ImageModelV4CallOptions, ImageModelV4Result, SharedV4Warning } from "@ai-sdk/provider";
import {
  combineHeaders,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  parseProviderOptions,
  postJsonToApi,
  type FetchFunction,
} from "@ai-sdk/provider-utils";
import { z } from "zod";

/** `anime` $0.003, `ultra` $0.01, `ultra-max` $0.02 per image. */
export type AnimeAPIImageModelId = "anime" | "ultra" | "ultra-max" | (string & {});

export type AnimeAPIOrientation = "portrait" | "square" | "landscape";

/** Options passed as `providerOptions.animeapi` to `generateImage`. */
export interface AnimeAPIImageProviderOptions {
  /** Shape of the image. Overrides `size` and `aspectRatio`. Default: portrait. */
  orientation?: AnimeAPIOrientation;
  /** Rewrite a plain-English prompt into tags for the anime model. API default: true. */
  enhance?: boolean;
  /** @deprecated Ignored by the API; adult output is not available. Kept so existing code compiles. */
  allowNsfw?: boolean;
}

const providerOptionsSchema = z.object({
  orientation: z.enum(["portrait", "square", "landscape"]).optional(),
  enhance: z.boolean().optional(),
});

const responseSchema = z.object({
  created: z.number().optional(),
  model: z.string().optional(),
  balance_usd: z.number().optional(),
  data: z.array(z.object({ b64_json: z.string(), revised_prompt: z.string().nullish() })),
});

const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().nullish(),
    param: z.string().nullish(),
    code: z.string().nullish(),
  }),
});

const failedResponseHandler = createJsonErrorResponseHandler({
  errorSchema,
  errorToMessage: (data) => data.error.message,
  // 429 and 5xx are worth retrying; a refused prompt, a bad key or an empty balance are not.
  isRetryable: (response) => response.status === 429 || response.status >= 500,
});

export interface AnimeAPIImageModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
}

function ratioToOrientation(width: number, height: number): AnimeAPIOrientation {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

export class AnimeAPIImageModel implements ImageModelV4 {
  readonly specificationVersion = "v4";
  /** The API returns up to 4 images per request. */
  readonly maxImagesPerCall = 4;
  readonly supportsFileInputs = false;
  readonly supportsMaskInputs = false;

  constructor(
    readonly modelId: AnimeAPIImageModelId,
    private readonly config: AnimeAPIImageModelConfig,
  ) {}

  get provider(): string {
    return this.config.provider;
  }

  async doGenerate(options: ImageModelV4CallOptions): Promise<ImageModelV4Result> {
    const { prompt, n, size, aspectRatio, seed, files, mask, providerOptions, headers, abortSignal } = options;
    const warnings: SharedV4Warning[] = [];

    if (seed != null) warnings.push({ type: "unsupported", feature: "seed" });
    if (files != null && files.length > 0) {
      warnings.push({ type: "unsupported", feature: "files", details: "AnimeAPI generates from text only." });
    }
    if (mask != null) warnings.push({ type: "unsupported", feature: "mask" });

    const animeapi = await parseProviderOptions({
      provider: "animeapi",
      providerOptions,
      schema: providerOptionsSchema,
    });

    // AnimeAPI has three shapes at one price each; exact pixel sizes are chosen by the model.
    let orientation: AnimeAPIOrientation | undefined = animeapi?.orientation;
    if (!orientation && size) {
      const [w, h] = size.split("x").map(Number);
      orientation = ratioToOrientation(w ?? NaN, h ?? NaN);
    } else if (!orientation && aspectRatio) {
      const [w, h] = aspectRatio.split(":").map(Number);
      orientation = ratioToOrientation(w ?? NaN, h ?? NaN);
    }

    const timestamp = new Date();
    const { value, responseHeaders } = await postJsonToApi({
      url: `${this.config.baseURL}/v1/images/generations`,
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        model: this.modelId,
        prompt,
        n,
        response_format: "b64_json",
        ...(orientation ? { orientation } : {}),
        ...(animeapi?.enhance !== undefined ? { enhance: animeapi.enhance } : {}),
      },
      failedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(responseSchema),
      abortSignal,
      fetch: this.config.fetch,
    });

    return {
      images: value.data.map((item) => item.b64_json),
      warnings,
      providerMetadata: {
        animeapi: {
          images: value.data.map((item) => ({ revisedPrompt: item.revised_prompt ?? null })),
          ...(value.balance_usd !== undefined ? { balanceUsd: value.balance_usd } : {}),
        },
      },
      response: { timestamp, modelId: value.model ?? this.modelId, headers: responseHeaders },
    };
  }
}
