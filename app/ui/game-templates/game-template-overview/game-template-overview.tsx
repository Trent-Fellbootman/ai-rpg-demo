import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import {
  ChatBubbleBottomCenterIcon,
  EyeIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import {
  getGameTemplateMetadataAndStatistics,
  markGameTemplateAsVisited,
} from "@/app/lib/database-actions/game-template-actions";
import { CommentInputForm } from "@/app/ui/game-templates/game-template-overview/comment-input-form";
import { CommentsList } from "@/app/ui/game-templates/game-template-overview/comments-list";
import { LikeButton } from "@/app/ui/game-templates/game-template-overview/like-button";
import { CreateGameSessionButton } from "@/app/ui/game-templates/game-template-overview/create-game-session-button";
import { GameTemplateDeleteButton } from "@/app/ui/game-templates/game-template-delete-button";
import { getTemplateEditPath } from "@/app/lib/utils/path";

export default async function GameTemplateOverview({
  userId,
  templateId,
}: {
  userId: number;
  templateId: number;
}) {
  // TODO: make this an inngest function
  await markGameTemplateAsVisited({ userId, gameTemplateId: templateId });

  const gameTemplateMetadata = await getGameTemplateMetadataAndStatistics({
    userId,
    gameTemplateId: templateId,
  });
  const userOwnsTemplate = gameTemplateMetadata.isOwnedByUser;

  return (
    <div className="flex flex-col">
      <Image
        alt={gameTemplateMetadata.imageDescription}
        src={gameTemplateMetadata.imageUrl}
      />
      <Spacer y={2} />
      <p className="text-3xl">{gameTemplateMetadata.name}</p>
      {/*statistics bar*/}
      {gameTemplateMetadata.isPublic && (
        <div className="flex flex-col">
          <Spacer y={4} />
          <Card>
            <CardBody>
              <div className="flex flex-row items-center space-x-4 sm:space-x-8">
                <div className="flex flex-row items-center space-x-2">
                  <div className="w-6 sm:w-8">
                    <EyeIcon />
                  </div>
                  <p>{gameTemplateMetadata.visitCount}</p>
                </div>
                <div className="flex flex-row items-center space-x-2">
                  <div className="w-6 sm:w-8">
                    <PlayIcon />
                  </div>
                  <p>{gameTemplateMetadata.childSessionsCount}</p>
                </div>
                <LikeButton
                  currentLikeCount={gameTemplateMetadata.undeletedLikeCount}
                  currentLiked={gameTemplateMetadata.isLiked}
                  gameTemplateId={templateId}
                  iconClassName="w-6 sm:w-8"
                  userId={userId}
                />
                <div className="flex flex-row items-center space-x-2">
                  <div className="w-6 sm:w-8">
                    <ChatBubbleBottomCenterIcon />
                  </div>
                  <p>{gameTemplateMetadata.undeletedCommentCount}</p>
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
                    <p className="text-xl">玩这个游戏</p>
                  </div>
                </CreateGameSessionButton>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {gameTemplateMetadata.description && (
        <div className="flex flex-col">
          <Spacer y={4} />
          <p>{gameTemplateMetadata.description}</p>
        </div>
      )}
      {!gameTemplateMetadata.isPublic && (
        <div className="flex flex-col">
          <Spacer y={4} />
          <CreateGameSessionButton gameTemplateId={templateId} userId={userId}>
            <div className="flex flex-row space-x-2 items-center">
              <div className="w-8">
                <PlayIcon />
              </div>
              <p className="text-xl">玩这个游戏</p>
            </div>
          </CreateGameSessionButton>
        </div>
      )}
      {userOwnsTemplate && (
        <>
          <Spacer y={4} />
          <div className="flex flex-row justify-end space-x-2">
            <GameTemplateDeleteButton templateId={templateId} userId={userId}>
              刪除游戏模板
            </GameTemplateDeleteButton>
            <Button
              as={Link}
              color="primary"
              href={getTemplateEditPath(templateId)}
              radius="full"
              variant="bordered"
            >
              编辑
            </Button>
          </div>
        </>
      )}
      {gameTemplateMetadata.isPublic && (
        <div className="flex flex-col">
          <Spacer y={8} />
          <p className="text-2xl">评论</p>
          <Spacer y={4} />
          <CommentInputForm gameTemplateId={templateId} userId={userId} />
          <Spacer y={4} />
          <CommentsList templateId={templateId} userId={userId} />
        </div>
      )}
    </div>
  );
}
