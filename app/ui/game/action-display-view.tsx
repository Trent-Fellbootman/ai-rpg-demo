import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import React from "react";
import { Link } from "@nextui-org/link";

import { getScenePlayPagePath } from "@/app/lib/utils/path";

export default function ActionDisplayView({
  action,
  sessionId,
  sceneIndex,
}: {
  action: string;
  sessionId: number;
  sceneIndex: number;
}) {
  const isFirstScene = sceneIndex === 0;

  return (
    <div className="flex flex-row items-center">
      <Textarea
        isReadOnly
        defaultValue={action}
        label="动作"
        maxRows={6}
        minRows={3}
        name="action"
        placeholder="Describe what you would like to do"
      />
      <Spacer x={1} />
      <div className="flex flex-col gap-2">
        <Button
          as={Link}
          color="primary"
          href={getScenePlayPagePath(sessionId, sceneIndex + 1)}
        >
          下一个场景
        </Button>
        <Button
          as={Link}
          color="secondary"
          href={getScenePlayPagePath(sessionId, sceneIndex - 1)}
          isDisabled={isFirstScene}
        >
          上一个场景
        </Button>
      </div>
    </div>
  );
}
