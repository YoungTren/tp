import { randomUUID } from "crypto";
import { resolveAttractionImageUrl } from "@/lib/attraction-image";
import type { DayLeisureModelStop } from "@/lib/day-leisure-schema";
import {
  fetchGooglePlacePriceHint,
  mergeEstimatedCost,
} from "@/lib/place-price-hint";
import type { LeisureRouteStop } from "@/types/trip";

const pickFallbackImage = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed.slice(0, 64))}/400/300`;

const resolveStopImage = async (params: {
  title: string;
  to: string;
  google: { apiKey: string; cseId: string };
  placesApiKey: string;
}): Promise<string> => {
  try {
    const img = await resolveAttractionImageUrl(params);
    if (img?.trim()) return img.trim();
  } catch {
    /* ниже fallback */
  }
  return pickFallbackImage(`${params.title}-${params.to}`);
};

/** Остановки независимы — параллельно укладываемся в лимит serverless (~10 с Hobby). */
export const buildLeisureRouteStopsFromModel = async (args: {
  ordered: DayLeisureModelStop[];
  to: string;
  google: { apiKey: string; cseId: string };
  placesApiKey: string;
}): Promise<LeisureRouteStop[]> => {
  const { ordered, to, google, placesApiKey } = args;
  const rows = await Promise.all(
    ordered.map(async (s, index) => {
      const id = randomUUID();
      const [image, placeHint] = await Promise.all([
        resolveStopImage({ title: s.title, to, google, placesApiKey }),
        fetchGooglePlacePriceHint(s.title, to, placesApiKey),
      ]);
      const estimatedCost = mergeEstimatedCost(s.estimatedCost, placeHint);
      const cardTeaser = s.cardTeaser?.trim();
      const stop: LeisureRouteStop = {
        id,
        order: index,
        title: s.title,
        description: s.description,
        category: s.category,
        rating: s.rating ?? 4.2,
        estimatedCost,
        lat: s.lat,
        lon: s.lon,
        image,
        ...(cardTeaser && cardTeaser.length > 0
          ? { cardTeaser }
          : {}),
        interestingFacts: s.interestingFacts,
      };
      return stop;
    })
  );
  return rows;
};
