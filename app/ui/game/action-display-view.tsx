import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import React from "react";
import { Link } from "@nextui-org/link";

export default async function ActionDisplayView({
  action,
  sessionId,
  sceneIndex,
}: {
  action: string;
  sessionId: string;
  sceneIndex: number;
}) {
  return (
    <div className="flex flex-row items-center">
      <Textarea
        isReadOnly
        defaultValue={action}
        label="Action"
        maxRows={5}
        minRows={2}
        name="action"
        placeholder="Describe what you would like to do"
      />
      <Spacer x={1} />
      <Button
        as={Link}
        color="primary"
        href={`/games/${sessionId}/play/${sceneIndex + 1}`}
      >
        Next Scene
      </Button>
    </div>
  );
}
