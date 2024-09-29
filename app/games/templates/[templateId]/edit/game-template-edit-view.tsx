import { getGameTemplateMetadataAndStatistics } from "@/app/lib/database-actions/game-template-actions";
import GameTemplateEditViewClient from "@/app/ui/game-templates/game-template-edit-view-client";
import { sampleSessionCreationTemplates } from "@/content/sample-session-setup";
import { createImageUrl } from "@/app/lib/database-actions/utils";
import { imageUrlExpireSeconds } from "@/app-config";

export default async function GameTemplateEditView({
  userId,
  templateId,
}: {
  userId: number;
  templateId: number;
}) {
  const sampleSetups = sampleSessionCreationTemplates;
  const gameTemplateMetadata = await getGameTemplateMetadataAndStatistics({
    userId,
    gameTemplateId: templateId,
  });

  return (
    <GameTemplateEditViewClient
      prefilledFields={{
        name: gameTemplateMetadata.name,
        description: gameTemplateMetadata.description ?? undefined,
        backstory: gameTemplateMetadata.backstory,
        coverImageUrl: gameTemplateMetadata.imageUrl,
        coverImageDescription: gameTemplateMetadata.imageDescription,
        firstSceneData: {
          imageDescription:
            gameTemplateMetadata.firstSceneData.imageDescription,
          imageUrl: (
            await createImageUrl(
              gameTemplateMetadata.firstSceneData.imagePath,
              imageUrlExpireSeconds,
            )
          ).url,
          event: gameTemplateMetadata.firstSceneData.event,
          narration: gameTemplateMetadata.firstSceneData.narration,
          proposedActions: gameTemplateMetadata.firstSceneData.proposedActions,
        },
      }}
      sampleSetups={sampleSetups}
      templateId={templateId}
      userId={userId}
    />
  );
}
