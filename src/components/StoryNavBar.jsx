import { Search, Star, Clock, Settings } from "lucide-react";

// TODO: wire these up once the search/saved/history/settings screens exist.
function StoryNavBar() {
  return (
    <nav className="story-nav-bar">
      <button type="button">
        <Search size={22} aria-hidden="true" />
        Search
      </button>

      <button type="button">
        <Star size={22} aria-hidden="true" />
        Saved
      </button>

      <button type="button">
        <Clock size={22} aria-hidden="true" />
        History
      </button>

      <button type="button">
        <Settings size={22} aria-hidden="true" />
        Settings
      </button>
    </nav>
  );
}

export default StoryNavBar;
