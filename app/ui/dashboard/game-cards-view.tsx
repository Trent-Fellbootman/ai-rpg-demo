import { Card, CardBody, CardFooter } from "@nextui-org/card";
import { Image } from "@nextui-org/image";

import {
  createTemporaryUrl,
  getUserGameSessions,
  retrieveScene,
} from "@/app/lib/data/apis";
import { getCurrentUser } from "@/app/lib/utils";
import { getScenePagePath } from "@/app/lib/utils/path";

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
        <a key={item.sessionId} href={getScenePagePath(item.sessionId, null)}>
          <Card key={index} isHoverable shadow="sm">
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
              <b>{item.sessionName}</b>
            </CardFooter>
          </Card>
        </a>
      ))}
    </div>
  );
}
