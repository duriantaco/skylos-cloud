CREATE POLICY "Enable delete for scan members" ON public.scans
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.projects
    JOIN public.organization_members
      ON projects.org_id = organization_members.org_id
    WHERE projects.id = scans.project_id
      AND organization_members.user_id = auth.uid()
  )
);
