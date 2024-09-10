import { Card, CardBody, CardFooter } from "@nextui-org/card";
import { Image } from "@nextui-org/image";

import { auth } from "@/auth";
import { getUserFromEmail, getUserGameSessions } from "@/app/lib/data/apis";

export default async function GameCardsView() {
  const session = await auth();

  if (!session) {
    return <p className="text-red-500">Failed to authenticate user</p>;
  }

  const email = session!.user!.email!;
  const userId = (await getUserFromEmail(email))!.userId;

  const userSessions = await getUserGameSessions(userId);

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
              src={""}
              width="100%"
            />
          </CardBody>
          <CardFooter className="text-small justify-between">
            <b>{item.sessionName}</b>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
