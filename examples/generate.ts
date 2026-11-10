// npx tsx examples/generate.ts   (needs ANIMEAPI_KEY)
import { generateImage } from "ai";
import { writeFile } from "node:fs/promises";
import { animeapi } from "@animeapi/ai-sdk-provider";

const { image, providerMetadata } = await generateImage({
  model: animeapi.image("anime"), // $0.003 per image
  prompt: "a knight cat drinking tea in a sunflower field",
  aspectRatio: "16:9",
});

await writeFile("knight-cat.webp", image.uint8Array);
console.log("saved knight-cat.webp", image.mediaType, providerMetadata?.animeapi);
