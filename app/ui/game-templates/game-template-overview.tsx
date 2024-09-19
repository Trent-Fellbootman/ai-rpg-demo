import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";

import { getGameTemplateNoComments } from "@/app/lib/database-actions/game-template-actions";

export default async function GameTemplateOverview({
  userId,
  templateId,
}: {
  userId: number;
  templateId: number;
}) {
  const gameTemplateMetadata = await getGameTemplateNoComments(
    userId,
    templateId,
  );

  return (
    <div className="flex flex-col">
      <Image
        alt={gameTemplateMetadata.imageDescription}
        src={gameTemplateMetadata.imageUrl}
      />
      <Spacer y={2} />
      <p className="text-3xl">{gameTemplateMetadata.name}</p>
      <Spacer y={2} />
      {gameTemplateMetadata.description && (
        <p>{gameTemplateMetadata.description}</p>
      )}
      <Spacer y={2} />
    </div>
  );
}
