-- 在 Supabase SQL Editor 中执行以下全部语句

-- 1. 创建留言表
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL CHECK (author IN ('boy', 'girl')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  style TEXT NOT NULL CHECK (style IN ('pink', 'blue', 'lavender', 'peach', 'mint')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. 创建地图标记表
CREATE TABLE IF NOT EXISTS markers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  description TEXT DEFAULT '' CHECK (char_length(description) <= 300),
  category TEXT NOT NULL CHECK (category IN ('dating', 'travel', 'food', 'first_time')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markers_created_at ON markers(created_at DESC);

-- 4. 创建按作者筛选留言的函数
CREATE OR REPLACE FUNCTION get_messages_by_author(author_filter TEXT DEFAULT NULL)
RETURNS SETOF messages AS $$
BEGIN
  IF author_filter IS NULL THEN
    RETURN QUERY SELECT * FROM messages ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM messages WHERE author = author_filter ORDER BY created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;
