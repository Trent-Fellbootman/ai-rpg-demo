import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import {
  ChatBubbleBottomCenterIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { Card, CardBody } from "@nextui-org/card";

import {
  getGameTemplateMetadata,
  getGameTemplateStatistics,
} from "@/app/lib/database-actions/game-template-actions";
import { CommentInputForm } from "@/app/ui/game-templates/game-template-overview/comment-input-form";
import { CommentsList } from "@/app/ui/game-templates/game-template-overview/comments-list";
import { LikeButton } from "@/app/ui/game-templates/game-template-overview/like-button";
import { CreateGameSessionButton } from "@/app/ui/game-templates/game-template-overview/create-game-session-button";

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

  const statistics = await getGameTemplateStatistics(templateId);

  return (
    <div className="flex flex-col">
      <Image
        alt={gameTemplateMetadata.imageDescription}
        src={gameTemplateMetadata.imageUrl}
      />
      <Spacer y={2} />
      <p className="text-3xl">{gameTemplateMetadata.name}</p>
      <Spacer y={4} />
      <Card>
        <CardBody>
          <div className="flex flex-row items-center space-x-8">
            <div className="flex flex-row items-center space-x-2">
              <div className="w-8">
                <PlayIcon />
              </div>
              <p>{statistics.childSessionsCount}</p>
            </div>
            <LikeButton
              currentLikeCount={statistics.undeletedLikeCount}
              currentLiked={gameTemplateMetadata.isLiked}
              gameTemplateId={templateId}
              userId={userId}
            />
            <div className="flex flex-row items-center space-x-2">
              <div className="w-8">
                <ChatBubbleBottomCenterIcon />
              </div>
              <p>{statistics.undeletedCommentCount}</p>
            </div>
            <div className="flex-grow" />
            <CreateGameSessionButton
              gameTemplateId={templateId}
              userId={userId}
            >
              <div className="flex flex-row space-x-2 items-center">
                <div className="w-8">
                  <PlayIcon />
                </div>
                <p className="text-xl">Play</p>
              </div>
            </CreateGameSessionButton>
          </div>
        </CardBody>
      </Card>

      {gameTemplateMetadata.description && (
        <div className="flex flex-col">
          <Spacer y={4} />
          <p>{gameTemplateMetadata.description}</p>
        </div>
      )}
      <Spacer y={8} />
      <p className="text-2xl">Comments</p>
      <Spacer y={4} />
      <CommentInputForm gameTemplateId={templateId} userId={userId} />
      <Spacer y={4} />
      <CommentsList templateId={templateId} userId={userId} />
    </div>
  );
}
