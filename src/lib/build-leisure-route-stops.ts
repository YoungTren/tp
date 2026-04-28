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

export const buildLeisureRouteStopsFromModel = async (args: {
  ordered: DayLeisureModelStop[];
  to: string;
  google: { apiKey: string; cseId: string };
  placesApiKey: string;
}): Promise<LeisureRouteStop[]> => {
  const { ordered, to, google, placesApiKey } = args;
  const stops: LeisureRouteStop[] = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const s = ordered[index]!;
    const id = randomUUID();
    let image: string;
    try {
      image = await resolveAttractionImageUrl({
        title: s.title,
        to,
        google,
        placesApiKey,
      });
    } catch {
      image = pickFallbackImage(`${s.title}-${to}`);
    }
    if (!image?.trim()) {
      image = pickFallbackImage(`${s.title}-${to}`);
    }
    const placeHint = await fetchGooglePlacePriceHint(
      s.title,
      to,
      placesApiKey
    );
    const estimatedCost = mergeEstimatedCost(s.estimatedCost, placeHint);
    const cardTeaser = s.cardTeaser?.trim();
    stops.push({
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
    });
  }
  return stops;
};
