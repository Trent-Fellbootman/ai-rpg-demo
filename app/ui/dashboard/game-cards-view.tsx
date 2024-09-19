import { Card, CardBody, CardFooter } from "@nextui-org/card";
import { Image } from "@nextui-org/image";
import { Link } from "@nextui-org/link";

import { getSessionOverviewPath } from "@/app/lib/utils/path";
import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { getGameSessionsByUser } from "@/app/lib/database-actions/game-session-actions";

export default async function GameCardsView() {
  const userId = (await getCurrentUser()).id;

  const userSessions = await getGameSessionsByUser(userId);

  if (userSessions.length === 0) {
    return (
      <p className="text-center font-bold text-xl">
        You don&apos;t have any sessions currently.
      </p>
    );
  }

  return (
    <div className="gap-2 grid grid-cols-2 sm:grid-cols-4">
      {userSessions.map((item, index) => (
        <Card
          key={index}
          // isHoverable
          // isPressable
          as={Link}
          href={getSessionOverviewPath(item.id)}
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
            <div className="w-full flex flex-col space-y-2 h-5">
              <p className="font-bold line-clamp-1">{item.name}</p>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
