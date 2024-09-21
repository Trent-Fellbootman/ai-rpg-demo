import { Spacer } from "@nextui-org/spacer";

import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { getTrendingGameTemplates } from "@/app/lib/database-actions/game-template-actions";
import GameTemplateCardsView from "@/app/ui/game-templates/game-template-cards-view";

export async function TrendingGameTemplatesView() {
  const user = await getCurrentUser();

  const trendingGameTemplates = await getTrendingGameTemplates(user.id);

  return (
    <div className="flex flex-col">
      <p className="font-bold text-3xl">Trending Games</p>
      <Spacer y={8} />
      <GameTemplateCardsView gameTemplatesMetadata={trendingGameTemplates} />
    </div>
  );
}
