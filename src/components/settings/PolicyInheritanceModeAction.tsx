'use client';

type PolicyInheritanceModeActionProps = {
  action: (formData: FormData) => void | Promise<void>;
  projectId: string;
  nextMode: "inherit" | "custom";
  className?: string;
  label: string;
};

export default function PolicyInheritanceModeAction({
  action,
  projectId,
  nextMode,
  className,
  label,
}: PolicyInheritanceModeActionProps) {
  const confirmMessage =
    nextMode === "custom"
      ? "Create a project override from the current workspace baseline? This project will stop inheriting future workspace policy changes until you revert it."
      : "Revert this project to the workspace baseline? The current project override editor will stop being the effective policy for new scans.";

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="mode" value={nextMode} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
