import { SharedTripClient } from "./shared-trip-client";

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SharedTripClient shareId={id} />;
}
