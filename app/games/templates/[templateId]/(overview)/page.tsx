import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import GameTemplateOverview from "@/app/ui/game-templates/game-template-overview/game-template-overview";

export default async function Page({
  params: { templateId },
}: {
  params: { templateId: string };
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex justify-center">
      <div className="max-w-2xl">
        <GameTemplateOverview
          templateId={parseInt(templateId)}
          userId={user.id}
        />
      </div>
    </div>
  );
}
