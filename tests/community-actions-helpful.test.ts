import { beforeEach, describe, expect, it, vi } from "vitest";
import * as communityActions from "@/lib/actions/community.action";

const mockCreateClient = vi.fn();
const mockAuthGetUser = vi.fn();
const mockAdminSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
  adminSupabase: mockAdminSupabase,
}));

const actions = communityActions as Record<string, any>;

let currentUserId = "author-1";

mockCreateClient.mockResolvedValue({
  auth: {
    getUser: mockAuthGetUser,
  },
});

mockAuthGetUser.mockImplementation(async () => ({
  data: { user: { id: currentUserId } },
}));

type CommentRecord = {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  isHelpful: boolean;
  helpfulMarkedBy: string | null;
  helpfulMarkedAt: string | null;
  isDeleted: boolean;
};

type PostRecord = { userId: string };

type SetupOptions = {
  comment?: Partial<CommentRecord>;
  post?: Partial<PostRecord>;
  profileExists?: boolean;
};

function setupHelpfulMocks({
  comment: commentOverrides = {},
  post: postOverrides = {},
  profileExists = true,
}: SetupOptions = {}) {
  const commentRecord: CommentRecord = {
    id: "comment-1",
    postId: "post-1",
    userId: "commenter-1",
    parentId: null,
    content: "Helpful insight",
    likesCount: 0,
    isHelpful: false,
    helpfulMarkedBy: null,
    helpfulMarkedAt: null,
    isDeleted: false,
    ...commentOverrides,
  };

  const postRecord: PostRecord = {
    userId: currentUserId,
    ...postOverrides,
  };

  const profileSelectResult = profileExists
    ? { data: { id: "profile-1" }, error: null }
    : { data: null, error: null };

  let lastUpdatePayload: Record<string, unknown> | null = null;
  const commentUpdateEq = vi.fn(async () => ({ error: null }));
  const commentUpdate = vi.fn((payload: Record<string, unknown>) => {
    lastUpdatePayload = payload;
    return { eq: commentUpdateEq };
  });

  const buildSelectChain = (result: { data: unknown; error: string | null }) => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => result),
    })),
  });

  const commentSelectChain = buildSelectChain({ data: commentRecord, error: null });
  const postSelectChain = buildSelectChain({ data: postRecord, error: null });
  const profileSelectChain = buildSelectChain(profileSelectResult);

  mockAdminSupabase.from.mockImplementation((table: string) => {
    if (table === "community_post_comments") {
      return {
        select: vi.fn(() => commentSelectChain),
        update: commentUpdate,
      };
    }

    if (table === "community_posts") {
      return {
        select: vi.fn(() => postSelectChain),
      };
    }

    if (table === "community_profiles") {
      return {
        select: vi.fn(() => profileSelectChain),
        insert: vi.fn(async () => ({ error: null })),
      };
    }

    throw new Error(`Unhandled table mock: ${table}`);
  });

  return {
    commentRecord,
    postRecord,
    getUpdatePayload: () => lastUpdatePayload,
    commentUpdateEq,
  };
}

beforeEach(() => {
  currentUserId = "author-1";
  mockAuthGetUser.mockClear();
  mockAdminSupabase.from.mockReset();
  mockAdminSupabase.rpc.mockReset();
  mockAdminSupabase.rpc.mockResolvedValue({ data: null, error: null });
});

describe("markCommentHelpful", () => {
  it("marks a comment as helpful, updates counters, and awards reputation", async () => {
    const { commentRecord, getUpdatePayload, commentUpdateEq } = setupHelpfulMocks();
    const awardSpy = vi
      .spyOn(communityActions, "awardReputationPoints")
      .mockResolvedValue({ data: { points: 10 }, error: null });

    const result = await actions.markCommentHelpful(commentRecord.id);

    expect(result).toEqual({ data: { success: true }, error: null });
    expect(commentUpdateEq).toHaveBeenCalledWith("id", commentRecord.id);

    const payload = getUpdatePayload();
    expect(payload).toMatchObject({
      isHelpful: true,
      helpfulMarkedBy: currentUserId,
    });
    expect(typeof payload?.helpfulMarkedAt).toBe("string");

    expect(mockAdminSupabase.rpc).toHaveBeenCalledWith("increment_profile_helpful_votes", {
      user_id: commentRecord.userId,
    });
    expect(awardSpy).toHaveBeenCalledWith(commentRecord.userId, "HELPFUL_ANSWER");

    awardSpy.mockRestore();
  });

  it("prevents users from marking their own comments as helpful", async () => {
    currentUserId = "same-user";
    setupHelpfulMocks({ comment: { userId: currentUserId } });
    const awardSpy = vi
      .spyOn(communityActions, "awardReputationPoints")
      .mockResolvedValue({ data: { points: 0 }, error: null });

    const result = await actions.markCommentHelpful("comment-1");

    expect(result).toEqual({ data: null, error: "You cannot mark your own comment as helpful" });
    expect(mockAdminSupabase.rpc).not.toHaveBeenCalled();
    expect(awardSpy).not.toHaveBeenCalled();

    awardSpy.mockRestore();
  });
});

describe("unmarkCommentHelpful", () => {
  it("reverses helpful marks and rolls back counters", async () => {
    const { commentRecord, getUpdatePayload, commentUpdateEq } = setupHelpfulMocks({
      comment: {
        isHelpful: true,
        helpfulMarkedBy: currentUserId,
        helpfulMarkedAt: "2025-01-01T00:00:00.000Z",
      },
    });
    const awardSpy = vi
      .spyOn(communityActions, "awardReputationPoints")
      .mockResolvedValue({ data: { points: -10 }, error: null });

    const result = await actions.unmarkCommentHelpful(commentRecord.id);

    expect(result).toEqual({ data: { success: true }, error: null });
    expect(commentUpdateEq).toHaveBeenCalledWith("id", commentRecord.id);
    expect(getUpdatePayload()).toEqual({
      isHelpful: false,
      helpfulMarkedBy: null,
      helpfulMarkedAt: null,
    });

    expect(mockAdminSupabase.rpc).toHaveBeenCalledWith("decrement_profile_helpful_votes", {
      user_id: commentRecord.userId,
    });
    expect(awardSpy).toHaveBeenCalledWith(commentRecord.userId, "HELPFUL_ANSWER", -1);

    awardSpy.mockRestore();
  });
});
