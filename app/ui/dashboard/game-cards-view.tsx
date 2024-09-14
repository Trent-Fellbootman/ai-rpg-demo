import { Card, CardBody, CardFooter } from "@nextui-org/card";
import { Image } from "@nextui-org/image";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import {
  createTemporaryUrl,
  getUserGameSessions,
  retrieveScene,
} from "@/app/lib/data/apis";
import { getCurrentUser } from "@/app/lib/utils";
import { getScenePlayPagePath, getSessionViewPath } from "@/app/lib/utils/path";

export default async function GameCardsView() {
  const userId = (await getCurrentUser()).userId;

  const userSessions = await getUserGameSessions(userId);
  const sessionCoverImageUrls = await Promise.all(
    userSessions.map(
      async (item) =>
        await createTemporaryUrl(
          (await retrieveScene(userId, item.sessionId, 0)).imageStoragePath,
        ),
    ),
  );

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
        <Card key={index} shadow="sm">
          <CardBody className="overflow-visible p-0">
            <Image
              alt={item.sessionName}
              className="w-full object-cover h-[140px]"
              radius="lg"
              shadow="sm"
              src={sessionCoverImageUrls[index]}
              width="100%"
            />
          </CardBody>
          <CardFooter className="text-small justify-between">
            <div className="w-full">
              <p className="font-bold">{item.sessionName}</p>
              <div className="flex flex-row justify-end gap-1">
                <Button
                  as={Link}
                  color="primary"
                  href={getScenePlayPagePath(item.sessionId, null)}
                  radius="full"
                  size="sm"
                >
                  Play
                </Button>
                <Button
                  as={Link}
                  color="secondary"
                  href={getSessionViewPath(item.sessionId)}
                  radius="full"
                  size="sm"
                >
                  View
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
