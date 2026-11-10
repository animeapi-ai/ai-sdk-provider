# AnimeAPI provider for the AI SDK

Anime image generation for the [Vercel AI SDK](https://ai-sdk.dev) at **$0.003 per image**, one of the cheapest anime image APIs. `generateImage` with [AnimeAPI](https://animeapi.ai): one call, a finished anime illustration in about 4 seconds. Prepaid balance from $5 that never expires, no subscription; new accounts get 3 free images without a card.

```bash
npm install @animeapi/ai-sdk-provider ai
```

Requires AI SDK 7 (`ai@7`).

## Use

Create a key at https://animeapi.ai/dashboard/api-keys and set `ANIMEAPI_KEY`.

```ts
import { generateImage } from "ai";
import { animeapi } from "@animeapi/ai-sdk-provider";
import { writeFile } from "node:fs/promises";

const { image } = await generateImage({
  model: animeapi.image("anime"), // $0.003 per image
  prompt: "a knight cat drinking tea in a sunflower field",
  aspectRatio: "16:9",
});

await writeFile("knight-cat.webp", image.uint8Array);
```

## Models and prices

| Model | Price per image | Use it for |
| --- | --- | --- |
| `anime` | **$0.003** | Characters, portraits, avatars, scenes. About 4 seconds. |
| `ultra` | $0.01 | Long, detailed prompts; legible text in the image. About 11 seconds. |
| `ultra-max` | $0.02 | Highest detail. |

Every shape costs the same.

## Settings

| `generateImage` setting | Support |
| --- | --- |
| `prompt` | Plain English, up to 1,000 characters. |
| `n` | 1 to 4 per request; larger numbers are split into several requests by the AI SDK. Each image is charged. |
| `aspectRatio` / `size` | Mapped to one of three shapes: wider than tall is `landscape`, taller is `portrait`, equal is `square`. Exact pixel sizes are chosen by the model. Default: portrait. |
| `seed` | Not supported (a warning is returned). |
| image inputs, masks | Not supported; generation is from text. |

Provider options, under `providerOptions.animeapi`:

```ts
await generateImage({
  model: animeapi.image("anime"),
  prompt: "a shrine maiden sweeping autumn leaves",
  providerOptions: {
    animeapi: {
      orientation: "landscape", // "portrait" | "square" | "landscape"; overrides size and aspectRatio
      enhance: true,            // rewrite plain English into tags for the anime model (API default: true)
      allowNsfw: false,         // API default: true. Set false where images land in shared spaces.
    },
  },
});
```

The result's `providerMetadata.animeapi` holds `images[i].revisedPrompt` (what the model read) and `balanceUsd` (balance left after the call).

## Custom instance

```ts
import { createAnimeAPI } from "@animeapi/ai-sdk-provider";

const animeapi = createAnimeAPI({
  apiKey: process.env.MY_ANIMEAPI_KEY, // default: ANIMEAPI_KEY
  headers: { "X-My-App": "1" },
  // baseURL, fetch
});
```

## Errors

Failed calls throw the AI SDK's `APICallError` with the HTTP status and AnimeAPI's message: 401 for a bad key, 402 for an empty balance, 400 when a prompt is refused. Rate limits (429) and temporary failures (5xx) are marked retryable, so the AI SDK's `maxRetries` handles them; failed generations are not charged.

## Good to know

- Images come back as WebP bytes. Image URLs on AnimeAPI are not permanent storage, which is why this provider returns the bytes for you to keep.
- AnimeAPI also has an OpenAI-compatible endpoint (`https://animeapi.ai/v1`) and a remote MCP server (`https://animeapi.ai/mcp`). Docs: https://animeapi.ai/docs

## Licence

MIT
