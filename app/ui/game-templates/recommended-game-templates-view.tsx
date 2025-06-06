import { Spacer } from "@nextui-org/spacer";

import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import {
  getRecommendedGameTemplates,
  markGameTemplateAsRecommended,
} from "@/app/lib/database-actions/game-template-actions";
import GameTemplateCardsView from "@/app/ui/game-templates/game-template-cards-view";

export async function RecommendedGameTemplatesView() {
  const user = await getCurrentUser();

  const recommendedGameTemplates = await getRecommendedGameTemplates({
    userId: user.id,
  });

  // TODO: make this an inngest function and optimize to reduce number of queries
  await Promise.all(
    recommendedGameTemplates.map((template) =>
      markGameTemplateAsRecommended({
        userId: user.id,
        gameTemplateId: template.id,
      }),
    ),
  );

  return (
    <div className="flex flex-col">
      <p className="font-bold text-3xl">推荐</p>
      <Spacer y={8} />
      <GameTemplateCardsView gameTemplatesMetadata={recommendedGameTemplates} />
    </div>
  );
}
