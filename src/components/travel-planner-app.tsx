"use client";

import { useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { TripSetup, type TripData } from "@/components/TripSetup";
import { Dashboard } from "@/components/Dashboard";
import { TripHistory } from "@/components/TripHistory";
import { TripHistoryDetail } from "@/components/TripHistoryDetail";
import { RecommendationsList } from "@/components/RecommendationsList";

type Screen =
  | "register"
  | "login"
  | "setup"
  | "dashboard"
  | "history"
  | "historyDetail"
  | "recommendations";

export const TravelPlannerApp = () => {
  const [screen, setScreen] = useState<Screen>("register");
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [selectedHistoryTripId, setSelectedHistoryTripId] = useState<
    string | null
  >(null);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<
    number | null
  >(null);

  const handleTripComplete = (data: TripData) => {
    setTripData(data);
    setScreen("dashboard");
  };

  const handleLogout = () => {
    setScreen("register");
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

  const handleOpenRecommendations = () => {
    setSelectedRecommendationId(null);
    setScreen("recommendations");
  };

  const handleOpenRecommendationById = (id: number) => {
    setSelectedRecommendationId(id);
    setScreen("recommendations");
  };

  const handleCloseRecommendations = () => {
    setSelectedRecommendationId(null);
    setScreen("dashboard");
  };

  if (screen === "register" || screen === "login") {
    return (
      <AuthScreen
        mode={screen}
        onRegister={() => setScreen("login")}
        onLogin={() => setScreen("setup")}
        onSwitchToLogin={() => setScreen("login")}
        onSwitchToRegister={() => setScreen("register")}
      />
    );
  }

  if (screen === "setup") {
    return <TripSetup onComplete={handleTripComplete} />;
  }

  if (screen === "dashboard" && tripData) {
    return (
      <Dashboard
        tripData={tripData}
        onLogout={handleLogout}
        onOpenHistory={handleOpenHistory}
        onCreateNew={handleCreateNew}
        onOpenRecommendations={handleOpenRecommendations}
        onOpenRecommendationById={handleOpenRecommendationById}
      />
    );
  }

  if (screen === "recommendations") {
    return (
      <RecommendationsList
        onClose={handleCloseRecommendations}
        selectedId={selectedRecommendationId}
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

  return (
    <AuthScreen
      mode="register"
      onRegister={() => setScreen("login")}
      onLogin={() => setScreen("setup")}
      onSwitchToLogin={() => setScreen("login")}
      onSwitchToRegister={() => setScreen("register")}
    />
  );
};
