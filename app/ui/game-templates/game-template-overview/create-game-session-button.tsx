"use client";

import { Button } from "@nextui-org/button";
import React, { useState } from "react";

import { createGameSessionFromTemplateAction } from "@/app/lib/actions";

export function CreateGameSessionButton({
  userId,
  gameTemplateId,
  children,
}: {
  userId: number;
  gameTemplateId: number;
  children?: React.ReactNode;
}) {
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const onPress = async () => {
    setIsProcessingAction(true);
    await createGameSessionFromTemplateAction(userId, gameTemplateId);
    setIsProcessingAction(false);
  };

  return (
    <Button color="primary" isLoading={isProcessingAction} onPress={onPress}>
      {children}
    </Button>
  );
}
