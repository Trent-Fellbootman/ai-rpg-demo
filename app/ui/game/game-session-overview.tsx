import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import { getGameSessionMetadata } from "@/app/lib/database-actions/game-session-actions";
import { getScenePlayPagePath, getSessionViewPath } from "@/app/lib/utils/path";

export default async function GameSessionOverview({
  userId,
  sessionId,
}: {
  userId: number;
  sessionId: number;
}) {
  const gameSessionMetadata = await getGameSessionMetadata({
    userId,
    sessionId,
  });

  return (
    <div className="flex flex-col">
      <Image
        alt={gameSessionMetadata.imageDescription}
        src={gameSessionMetadata.imageUrl}
      />
      <Spacer y={2} />
      <p className="text-3xl">{gameSessionMetadata.name}</p>
      <Spacer y={2} />
      {gameSessionMetadata.description && (
        <p>{gameSessionMetadata.description}</p>
      )}
      <Spacer y={2} />
      <div className="flex flex-row justify-end gap-1">
        <Button
          as={Link}
          color="primary"
          href={getScenePlayPagePath(sessionId, null)}
          radius="full"
          size="md"
          variant="solid"
        >
          Play
        </Button>
        <Button
          as={Link}
          color="secondary"
          href={getSessionViewPath(sessionId)}
          radius="full"
          size="md"
          variant="solid"
        >
          View
        </Button>
      </div>
    </div>
  );
}
