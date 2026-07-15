import { useState } from "react";
import { mockStory } from "./data/mockStory";

import WelcomePage from "./pages/WelcomePage";
import SessionSetupPage from "./pages/SessionSetupPage";
import StorySelectionPage from "./pages/StorySelectionPage";
import StoryPreviewPage from "./pages/StoryPreviewPage";
import ReadingPage from "./pages/ReadingPage";

import "./App.css";

function App() {
  const [screen, setScreen] = useState("welcome");

  if (screen === "welcome") {
    return <WelcomePage onStart={() => setScreen("setup")} />;
  }

  if (screen === "setup") {
    return (
      <SessionSetupPage
        onBack={() => setScreen("welcome")}
        onContinue={() => setScreen("selection")}
      />
    );
  }

  if (screen === "selection") {
    return (
      <StorySelectionPage
        story={mockStory}
        onViewStory={() => setScreen("preview")}
      />
    );
  }

  if (screen === "preview") {
    return (
      <StoryPreviewPage
        story={mockStory}
        onBack={() => setScreen("selection")}
        onBegin={() => setScreen("reading")}
      />
    );
  }

  return <ReadingPage story={mockStory} />;
}

export default App;