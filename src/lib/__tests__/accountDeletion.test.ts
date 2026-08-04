import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  table: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: mocks.table,
    storage: { from: mocks.storageFrom },
  }),
}));

import { deleteUserData } from "../server/accountDeletion";

describe("account data deletion", () => {
  beforeEach(() => {
    mocks.table.mockReset();
    mocks.storageFrom.mockReset();
  });

  it("removes user-owned documents and both private storage prefixes", async () => {
    const articleEq = vi.fn().mockResolvedValue({ error: null, count: 2 });
    const auditOr = vi.fn().mockResolvedValue({ error: null, count: 3 });
    mocks.table.mockImplementation((name: string) => ({
      delete: () =>
        name === "library_articles"
          ? { eq: articleEq }
          : { or: auditOr },
    }));

    const removals: string[][] = [];
    mocks.storageFrom.mockImplementation((bucket: string) => ({
      list: vi.fn().mockResolvedValue({
        data:
          bucket === "counsellor-profile"
            ? [{ name: "portrait.webp" }]
            : [{ name: "licence.pdf" }, { name: "identity.png" }],
        error: null,
      }),
      remove: vi.fn(async (paths: string[]) => {
        removals.push(paths);
        return { error: null };
      }),
    }));

    await expect(deleteUserData("user-123")).resolves.toEqual({
      deletedDocuments: 5,
      deletedFiles: 3,
    });
    expect(articleEq).toHaveBeenCalledWith("author_id", "user-123");
    expect(auditOr).toHaveBeenCalledWith(
      "actor_id.eq.user-123,subject_id.eq.user-123",
    );
    expect(removals).toEqual([
      ["user-123/portrait.webp"],
      ["user-123/licence.pdf", "user-123/identity.png"],
    ]);
  });

  it("stops before reporting success when a database deletion fails", async () => {
    mocks.table.mockReturnValue({
      delete: () => ({
        eq: vi.fn().mockResolvedValue({
          error: { message: "database unavailable" },
          count: null,
        }),
      }),
    });

    await expect(deleteUserData("user-123")).rejects.toThrow(
      "database unavailable",
    );
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });

  it("does not call remove when a storage prefix is empty", async () => {
    mocks.table.mockImplementation((name: string) => ({
      delete: () =>
        name === "library_articles"
          ? { eq: vi.fn().mockResolvedValue({ error: null, count: 0 }) }
          : { or: vi.fn().mockResolvedValue({ error: null, count: 0 }) },
    }));
    const remove = vi.fn();
    mocks.storageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove,
    });

    await expect(deleteUserData("user-123")).resolves.toEqual({
      deletedDocuments: 0,
      deletedFiles: 0,
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
