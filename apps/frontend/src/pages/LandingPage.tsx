import { Architecture } from "../landing/Architecture";
import { Footer } from "../landing/Footer";
import { Hero } from "../landing/Hero";
import { HeuristicTie } from "../landing/HeuristicTie";
import { LiveDemo } from "../landing/LiveDemo";
import { NumbersBand } from "../landing/NumbersBand";
import { StackChips } from "../landing/StackChips";

// TODO: replace with the real LinkedIn profile URL
export const LINKEDIN_URL = "https://www.linkedin.com/in/REPLACE_ME";

export function LandingPage() {
  return (
    <>
      <Hero />
      <LiveDemo />
      <HeuristicTie />
      <Architecture />
      <NumbersBand />
      <StackChips />
      <Footer linkedinUrl={LINKEDIN_URL} />
    </>
  );
}
