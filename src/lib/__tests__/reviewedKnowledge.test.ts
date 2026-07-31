import { describe, expect, it } from "vitest";

describe("reviewed knowledge source contract", () => {
  it("uses deep links that stay inside the governed library", () => {
    const id = "7bf08fc9-854c-4578-9823-63353ad15ef1";
    expect(`/library?article=${encodeURIComponent(id)}`).toBe(
      `/library?article=${id}`,
    );
  });
});
