import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";

import { getGameTemplateMetadata } from "@/app/lib/database-actions/game-template-actions";
import { CommentInputForm } from "@/app/ui/game-templates/game-template-overview/comment-input-form";
import { CommentsList } from "@/app/ui/game-templates/game-template-overview/comments-list";
import { LikeButton } from "@/app/ui/game-templates/game-template-overview/like-button";

export default async function GameTemplateOverview({
  userId,
  templateId,
}: {
  userId: number;
  templateId: number;
}) {
  const gameTemplateMetadata = await getGameTemplateMetadata(
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
      <div className="flex flex-row justify-end w-full">
        <LikeButton
          currentLikeCount={gameTemplateMetadata.likeCount}
          currentLiked={gameTemplateMetadata.isLiked}
          gameTemplateId={templateId}
          userId={userId}
        />
      </div>
      <Spacer y={2} />
      <CommentInputForm gameTemplateId={templateId} userId={userId} />
      <Spacer y={2} />
      <p className="text-2xl">Comments</p>
      <Spacer y={4} />
      <CommentsList templateId={templateId} userId={userId} />
    </div>
  );
}
