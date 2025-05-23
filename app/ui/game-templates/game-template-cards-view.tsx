import { Card, CardBody, CardFooter } from "@nextui-org/card";
import { Image } from "@nextui-org/image";
import { Link } from "@nextui-org/link";
import {
  ChatBubbleBottomCenterIcon,
  EyeIcon,
  HeartIcon,
  PlayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

import { constants, getTemplateOverviewPath } from "@/app/lib/utils/path";
import {
  GameTemplateMetadata,
  GameTemplateStatistics,
} from "@/app/lib/database-actions/game-template-actions";

export default async function GameTemplateCardsView({
  gameTemplatesMetadata,
  includeNewTemplateButton = false,
}: {
  gameTemplatesMetadata: (GameTemplateMetadata & GameTemplateStatistics)[];
  includeNewTemplateButton?: boolean;
}) {
  return (
    <div className="gap-2 grid grid-cols-2 sm:grid-cols-4">
      {gameTemplatesMetadata.map((item, index) => (
        <Card
          key={index}
          as={Link}
          href={getTemplateOverviewPath(item.id)}
          shadow="sm"
        >
          <CardBody className="overflow-visible p-0">
            <Image
              alt={item.imageDescription}
              className="w-full object-cover h-[140px]"
              radius="lg"
              shadow="sm"
              src={item.imageUrl}
              width="100%"
            />
          </CardBody>
          <CardFooter className="text-small justify-between">
            <div className="w-full flex flex-col space-y-2">
              <p className="font-bold line-clamp-1">{item.name}</p>
              <div className="w-full flex flex-row justify-end space-x-2 items-center">
                <div className="w-6">
                  <EyeIcon />
                </div>
                <p>{item.visitCount}</p>
                <div className="w-6">
                  <PlayIcon />
                </div>
                <p>{item.childSessionsCount}</p>
                <div className="w-6">
                  <HeartIcon />
                </div>
                <p>{item.undeletedLikeCount}</p>
                <div className="w-6">
                  <ChatBubbleBottomCenterIcon />
                </div>
                <p>{item.undeletedCommentCount}</p>
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
      {includeNewTemplateButton && (
        <Card
          key={gameTemplatesMetadata.length}
          as={Link}
          href={constants.newGameTemplatePagePath}
          shadow="sm"
        >
          <CardBody className="overflow-visible p-0">
            <div className="w-full h-full flex flex-row justify-center items-center">
              <div className="w-full max-w-32">
                <PlusIcon />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
