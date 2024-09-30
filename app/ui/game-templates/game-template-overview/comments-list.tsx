import { Card, CardBody } from "@nextui-org/card";

import { getComments } from "@/app/lib/database-actions/game-template-actions";

export async function CommentsList({
  userId,
  templateId,
}: {
  userId: number;
  templateId: number;
}) {
  const comments = await getComments({ userId, gameTemplateId: templateId });

  return (
    <div className="flex flex-col w-full space-y-4">
      {comments.map((comment, index) => (
        <Card key={index} className="flex flex-col justify-start w-full">
          <CardBody>
            <div className="flex flex-col space-y-1">
              <p className="text-small">
                {comment.username ?? "匿名用户"}{" "}
                {comment.createdAt.toLocaleString("zh-CN")}
              </p>
              <p>{comment.text}</p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
