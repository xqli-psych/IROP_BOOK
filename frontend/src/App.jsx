import { useState } from "react";

import WelcomePage from "./pages/WelcomePage";
import SessionSetupPage from "./pages/SessionSetupPage";
import StorySelectionPage from "./pages/StorySelectionPage";
import StoryPreviewPage from "./pages/StoryPreviewPage";
import ReadingPage from "./pages/ReadingPage";
import FinishedPage from "./pages/FinishedPage";

import "./App.css";

function App() {
  const [screen, setScreen] = useState("welcome");
  const [selectedStory, setSelectedStory] = useState(null);

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
        onViewStory={(story) => {
          setSelectedStory(story);
          setScreen("preview");
        }}
      />
    );
  }

  if (screen === "preview") {
    return (
      <StoryPreviewPage
        story={selectedStory}
        onBack={() => setScreen("selection")}
        onBegin={() => setScreen("reading")}
      />
    );
  }

  if (screen === "finished") {
    return (
      <FinishedPage
        story={selectedStory}
        onReturnToStories={() => setScreen("selection")}
      />
    );
  }

  return (
    <ReadingPage
      story={selectedStory}
      onFinish={() => setScreen("finished")}
      onExit={() => setScreen("selection")}
    />
  );
}

export default App;