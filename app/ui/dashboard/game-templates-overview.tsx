import { Card, CardBody, CardFooter } from "@nextui-org/card";
import { Image } from "@nextui-org/image";
import { Link } from "@nextui-org/link";
import {
  ChatBubbleBottomCenterIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

import { getSessionOverviewPath, getTemplateOverviewPath } from "@/app/lib/utils/path";
import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { getGameTemplatesByUser } from "@/app/lib/database-actions/game-template-actions";

export default async function GameTemplatesOverview() {
  const userId = (await getCurrentUser()).id;

  const templates = await getGameTemplatesByUser(userId);

  if (templates.length === 0) {
    return (
      <p className="text-center font-bold text-xl">
        You haven&apos;t created any game templates currently.
      </p>
    );
  }

  return (
    <div className="gap-2 grid grid-cols-2 sm:grid-cols-4">
      {templates.map((item, index) => (
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
                  <HeartIcon />
                </div>
                <p>{item.likes}</p>
                <div className="w-6">
                  <ChatBubbleBottomCenterIcon />
                </div>
                <p>{item.comments}</p>
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
