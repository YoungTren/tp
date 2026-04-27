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
