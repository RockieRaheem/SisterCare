import { describe, expect, it } from "vitest";
import { selectConversationMemory } from "@/lib/chatPipeline/memory";
import { derivePeriodStartDate } from "@/lib/periodUpdateIntent";

describe("authoritative chat memory", () => {
  it("uses the persisted transcript and removes the duplicated current turn", () => {
    expect(
      selectConversationMemory(
        [
          { role: "user", content: "Please update my period" },
          { role: "assistant", content: "What date did it start?" },
          { role: "user", content: "It was last month on 26th" },
        ],
        [{ role: "user", content: "Only the latest browser turn" }],
        "It was last month on 26th",
      ),
    ).toEqual([
      { role: "user", content: "Please update my period" },
      { role: "assistant", content: "What date did it start?" },
    ]);
  });

  it("falls back to browser history when durable memory is unavailable", () => {
    expect(
      selectConversationMemory([], [{ role: "user", content: "Remember me" }], "Hello"),
    ).toEqual([{ role: "user", content: "Remember me" }]);
  });
});

describe("period update intent", () => {
  const now = new Date("2026-07-28T12:00:00");

  it("resolves a contextual last-month date without asking the model to guess", () => {
    const date = derivePeriodStartDate(
      "It was last month on 26th",
      [{ role: "assistant", content: "Period Update Needed: what date did it start?" }],
      now,
    );
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([
      2026,
      5,
      26,
    ]);
  });

  it("records a relative period update precisely", () => {
    const date = derivePeriodStartDate(
      "My last period occurred 2 days ago",
      [],
      now,
    );
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([
      2026,
      6,
      26,
    ]);
  });

  it("does not treat an unrelated date as a period update", () => {
    expect(derivePeriodStartDate("I went to clinic last month on 26th", [], now)).toBeNull();
  });
});
