UPDATE public.projects
SET repo_url = regexp_replace(
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(btrim(repo_url), '^git@github\.com:', 'https://github.com/'),
        '^ssh://git@github\.com/',
        'https://github.com/'
      ),
      '^http://',
      'https://'
    )
  ),
  '/+$',
  ''
)
WHERE repo_url IS NOT NULL;

UPDATE public.projects
SET repo_url = regexp_replace(repo_url, '\.git$', '')
WHERE repo_url IS NOT NULL
  AND repo_url LIKE 'https://github.com/%';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.projects
    WHERE repo_url IS NOT NULL
    GROUP BY repo_url
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate project repo_url bindings exist. Resolve duplicates in public.projects before applying the unique index.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS projects_repo_url_unique
  ON public.projects (repo_url)
  WHERE repo_url IS NOT NULL;
