import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BigButton } from "../ui/BigButton.js";
import { createProfile, createSession, getStory } from "../lib/api.js";
import { Reader } from "../features/reader/Reader.js";

const FIXTURE_STORY_ID = "moonlit-forest-01";

type View = "landing" | "bootstrapping" | "reading" | "finished" | "error";

/**
 * There's no hero builder yet (that's onboarding, not Reader Mode — out of
 * scope for Phase 1). Starting the demo creates a profile from a single
 * curated default so the reviewer path still needs exactly one tap.
 */
async function bootstrapProfile(): Promise<string> {
  await createSession();
  const profile = await createProfile({
    heroNameId: "nora",
    avatarComboId: "default",
    pronouns: "she/her",
    ageBand: "5-6",
  });
  return profile.id;
}

export function App() {
  const [view, setView] = useState<View>("landing");
  const [profileId, setProfileId] = useState<string | null>(null);

  const storyQuery = useQuery({
    queryKey: ["story", FIXTURE_STORY_ID],
    queryFn: () => getStory(FIXTURE_STORY_ID),
    enabled: view === "reading" || view === "finished",
  });

  async function handleStart() {
    setView("bootstrapping");
    try {
      const id = await bootstrapProfile();
      setProfileId(id);
      setView("reading");
    } catch {
      setView("error");
    }
  }

  if ((view === "reading" || view === "finished") && storyQuery.isError) {
    return (
      <main className="landing">
        <h1>Storylight</h1>
        <p role="alert">The story ink ran dry — the shelf couldn&rsquo;t load. Please try again.</p>
        <BigButton onClick={() => storyQuery.refetch()}>Try again</BigButton>
      </main>
    );
  }

  if (view === "reading" && profileId && storyQuery.data) {
    return <Reader story={storyQuery.data} profileId={profileId} onFinished={() => setView("finished")} />;
  }

  if (view === "finished") {
    return (
      <main className="landing">
        <h1>The End</h1>
        <p>Nora and Pip made it home. Great reading!</p>
        <BigButton onClick={() => setView("reading")}>Read again</BigButton>
      </main>
    );
  }

  return (
    <main className="landing">
      <h1>Storylight</h1>
      <p>
        A child co-creates a story where they&rsquo;re the hero, then gradually takes over the
        reading. Best on iPad.
      </p>
      <BigButton onClick={handleStart} disabled={view === "bootstrapping"}>
        {view === "bootstrapping" || (view === "reading" && storyQuery.isLoading) ? "Starting…" : "Start"}
      </BigButton>
      {view === "error" && <p role="alert">Something went wrong starting the demo. Try again.</p>}
      <nav className="engineer-links">
        <a href="https://github.com/" target="_blank" rel="noreferrer">
          Repo
        </a>
        <a href="/internal">Internal</a>
      </nav>
    </main>
  );
}
