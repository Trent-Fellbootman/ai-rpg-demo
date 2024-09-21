import { Spacer } from "@nextui-org/spacer";

import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { getRecommendedGameTemplates } from "@/app/lib/database-actions/game-template-actions";
import GameTemplateCardsView from "@/app/ui/game-templates/game-template-cards-view";

export async function RecommendedGameTemplatesView() {
  const user = await getCurrentUser();

  const recommendedGameTemplates = await getRecommendedGameTemplates(user.id);

  return (
    <div className="flex flex-col">
      <p className="font-bold text-3xl">Recommended for You</p>
      <Spacer y={8} />
      <GameTemplateCardsView gameTemplatesMetadata={recommendedGameTemplates} />
    </div>
  );
}
