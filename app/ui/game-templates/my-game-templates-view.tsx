import GameTemplateCardsView from "@/app/ui/game-templates/game-template-cards-view";
import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import {
  getGameTemplatesByUser,
  getGameTemplateStatistics,
} from "@/app/lib/database-actions/game-template-actions";

export async function MyGameTemplatesView() {
  const userId = (await getCurrentUser()).id;

  const templates = await getGameTemplatesByUser(userId);
  // TODO: optimize
  const statistics = await Promise.all(
    templates.map((template) => getGameTemplateStatistics(template.id)),
  );

  if (templates.length === 0) {
    return (
      <p className="text-center font-bold text-xl">
        You haven&apos;t created any game templates currently.
      </p>
    );
  }

  return (
    <GameTemplateCardsView
      gameTemplatesMetadata={templates.map((template) => {
        const stats = statistics.filter((stat) => stat.id === template.id)[0];

        return {
          ...template,
          childSessionCount: stats.childSessionsCount,
          visitCount: stats.visitCount,
        };
      })}
    />
  );
}
