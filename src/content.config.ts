import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const games = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/games" }),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      title: z.string(),
      platform: z.string(),
      edition: z.string(),
      status: z.enum(["dang-dich", "hoan-thanh", "tam-dung"]),
      progress: z.number().int().min(0).max(100),
      tagline: z.string(),
      cover: image().optional(),
      screenshots: z.array(image()).default([]),
      credits: z.array(z.object({ name: z.string(), role: z.string() })).default([]),
    }),
});

export const collections = { games };
