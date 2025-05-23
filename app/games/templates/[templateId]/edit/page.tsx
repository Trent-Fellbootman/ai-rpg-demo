import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import GameTemplateEditView from "./game-template-edit-view";

export default async function Page({
  params: { templateId },
}: {
  params: { templateId: string };
}) {
  const user = await getCurrentUser();

  return (
    <div className="w-full flex flex-col items-center">
      <GameTemplateEditView
        templateId={parseInt(templateId)}
        userId={user.id}
      />
    </div>
  );
}
