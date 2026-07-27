import { describe, expect, it } from "vitest";
import {
  assertCompleteResponse,
  isClearlyIncompleteResponse,
  wasResponseTruncated,
} from "@/lib/agent/responseIntegrity";

describe("agent response integrity", () => {
  it.each(["length", "MAX_TOKENS", "max_output_tokens"])(
    "rejects provider token-limit finish reason %s",
    (reason) => {
      expect(wasResponseTruncated(reason)).toBe(true);
      expect(() => assertCompleteResponse("A complete-looking answer.", reason)).toThrow(
        "truncated",
      );
    },
  );

  it("detects the incomplete Luganda form reported in production", () => {
    expect(
      isClearlyIncompleteResponse(
        "Nkutegeredde. Kubanga olabika ng'oli",
      ),
    ).toBe(true);
  });

  it("accepts a complete Luganda health response", () => {
    expect(
      isClearlyIncompleteResponse(
        "Nsaba ogende mu ddwaliro leero, kubanga obulumi obw'amaanyi mu lubuto nga oyinza okuba olubuto bwetaaga okukeberebwa.",
      ),
    ).toBe(false);
  });
});
