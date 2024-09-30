import GameTemplateCreationViewClient from "./game-template-creation-view-client";

import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { sampleSessionCreationTemplates } from "@/content/sample-session-setup";

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col w-full space-y-2">
      <p className="text-center text-3xl">创建游戏模板</p>
      <GameTemplateCreationViewClient
        sampleTemplatesData={sampleSessionCreationTemplates}
        userId={user.id}
      />
    </div>
  );
}
