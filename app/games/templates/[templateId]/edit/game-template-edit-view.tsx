import { sampleSessionCreationTemplates } from "@/content/sample-session-setup";
import { getGameTemplateMetadataAndStatistics } from "@/app/lib/database-actions/game-template-actions";
import { createImageUrl } from "@/app/lib/database-actions/utils";
import { imageUrlExpireSeconds } from "@/app-config";
import GameTemplateEditViewClient from "@/app/games/templates/[templateId]/edit/game-template-edit-view-client";

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
        publicTemplate: gameTemplateMetadata.isPublic,
      }}
      sampleTemplatesData={sampleSetups}
      templateId={templateId}
      userId={userId}
    />
  );
}
