import { LEISURE_CARD_TEASER_MAX } from "@/lib/day-leisure-schema";
import type { LeisureRouteStop } from "@/types/trip";

export const getStopInterestingFacts = (
  stop: LeisureRouteStop
): readonly [string, string, string] => {
  const f = stop.interestingFacts;
  if (f && f.length === 3) {
    return [f[0]!, f[1]!, f[2]!];
  }
  return ["—", "—", "—"];
};

const clampForCard = (s: string): string => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= LEISURE_CARD_TEASER_MAX) return t;
  return t.slice(0, LEISURE_CARD_TEASER_MAX);
};

/** Подзаголовок в карточке: `cardTeaser` от DeepSeek или сжатый фоллбек. */
export const getStopCardTeaser = (stop: LeisureRouteStop): string => {
  const c = stop.cardTeaser?.trim();
  if (c) return c;
  const fromFact = stop.interestingFacts?.[0]?.trim();
  if (fromFact) return clampForCard(fromFact);
  return clampForCard((stop.description ?? "").trim());
};
