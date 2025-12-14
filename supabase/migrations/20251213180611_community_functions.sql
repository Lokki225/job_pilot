-- Increment post likes count
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET "likesCount" = "likesCount" + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement post likes count
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET "likesCount" = GREATEST("likesCount" - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Increment comment likes count
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_post_comments
  SET "likesCount" = "likesCount" + 1
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement comment likes count
CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_post_comments
  SET "likesCount" = GREATEST("likesCount" - 1, 0)
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Increment post comments count
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET "commentsCount" = "commentsCount" + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement post comments count
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET "commentsCount" = GREATEST("commentsCount" - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Increment chat room member count
CREATE OR REPLACE FUNCTION increment_room_members(room_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_rooms
  SET "memberCount" = "memberCount" + 1
  WHERE id = room_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement chat room member count
CREATE OR REPLACE FUNCTION decrement_room_members(room_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_rooms
  SET "memberCount" = GREATEST("memberCount" - 1, 0)
  WHERE id = room_id;
END;
$$ LANGUAGE plpgsql;

-- Increment community profile posts count
CREATE OR REPLACE FUNCTION increment_profile_posts(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_profiles
  SET "postsCount" = "postsCount" + 1
  WHERE "userId" = user_id;
END;
$$ LANGUAGE plpgsql;

-- Increment community profile comments count
CREATE OR REPLACE FUNCTION increment_profile_comments(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_profiles
  SET "commentsCount" = "commentsCount" + 1
  WHERE "userId" = user_id;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reactions;
