import { NextResponse } from "next/server";
import { getSharedTrip } from "@/lib/trip-share-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const trip = await getSharedTrip(id);
  if (!trip) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(trip);
}
