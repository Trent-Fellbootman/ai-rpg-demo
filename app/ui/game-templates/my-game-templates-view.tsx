import GameTemplateCardsView from "@/app/ui/game-templates/game-template-cards-view";
import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { getGameTemplatesByUser } from "@/app/lib/database-actions/game-template-actions";

export async function MyGameTemplatesView() {
  const userId = (await getCurrentUser()).id;

  const templates = await getGameTemplatesByUser({ userId });

  return (
    <GameTemplateCardsView
      gameTemplatesMetadata={templates}
      includeNewTemplateButton={true}
    />
  );
}
