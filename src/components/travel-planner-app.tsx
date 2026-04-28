"use client";

import { useCallback, useState } from "react";
import { TripSetup } from "@/components/TripSetup";
import type { TripData } from "@/types/trip";
import { Dashboard } from "@/components/Dashboard";
import { TripHistory } from "@/components/TripHistory";
import { TripHistoryDetail } from "@/components/TripHistoryDetail";

type Screen = "setup" | "dashboard" | "history" | "historyDetail";

export const TravelPlannerApp = () => {
  const [screen, setScreen] = useState<Screen>("setup");
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [tripSessionId, setTripSessionId] = useState(0);
  const [selectedHistoryTripId, setSelectedHistoryTripId] = useState<
    string | null
  >(null);

  const handleTripComplete = (data: TripData) => {
    setTripData(data);
    setTripSessionId((n) => n + 1);
    setScreen("dashboard");
  };

  const updateTripData = useCallback((next: (prev: TripData) => TripData) => {
    setTripData((p) => (p ? next(p) : p));
  }, []);

  const handleLogout = () => {
    setScreen("setup");
    setTripData(null);
  };

  const handleOpenHistory = () => {
    setScreen("history");
  };

  const handleCloseHistory = () => {
    setScreen("dashboard");
  };

  const handleSelectHistoryTrip = (tripId: string) => {
    setSelectedHistoryTripId(tripId);
    setScreen("historyDetail");
  };

  const handleBackFromHistoryDetail = () => {
    setScreen("history");
  };

  const handleCreateNew = () => {
    setScreen("setup");
  };

  if (screen === "setup") {
    return <TripSetup onComplete={handleTripComplete} />;
  }

  if (screen === "dashboard" && tripData) {
    return (
      <Dashboard
        key={tripSessionId}
        tripData={tripData}
        onTripDataChange={updateTripData}
        onLogout={handleLogout}
        onOpenHistory={handleOpenHistory}
        onCreateNew={handleCreateNew}
      />
    );
  }

  if (screen === "history") {
    return (
      <TripHistory
        onClose={handleCloseHistory}
        onSelectTrip={handleSelectHistoryTrip}
      />
    );
  }

  if (screen === "historyDetail" && selectedHistoryTripId) {
    return (
      <TripHistoryDetail
        tripId={selectedHistoryTripId}
        onBack={handleBackFromHistoryDetail}
      />
    );
  }

  return <TripSetup onComplete={handleTripComplete} />;
};
