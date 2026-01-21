drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
drop function if exists public.set_updated_at();
drop table if exists public.blog_posts cascade;