"use client";

import { HeartIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";
import { Button } from "@nextui-org/button";

import {
  addLike,
  deleteLike,
} from "@/app/lib/database-actions/game-template-actions";

export function LikeButton({
  userId,
  gameTemplateId,
  currentLiked,
  currentLikeCount,
}: {
  userId: number;
  gameTemplateId: number;
  currentLiked: boolean;
  currentLikeCount: number;
}) {
  const [isLiked, setIsLiked] = useState<boolean>(currentLiked);
  const [likeCount, setLikeCount] = useState<number>(currentLikeCount);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsProcessing(true);

    if (isLiked) {
      await deleteLike({ userId, gameTemplateId });
      setLikeCount(likeCount - 1);
    } else {
      await addLike({ userId, gameTemplateId });
      setLikeCount(likeCount + 1);
    }

    setIsLiked(!isLiked);

    setIsProcessing(false);
  };

  return (
    <div className="flex flex-row items-center space-x-1">
      <form onSubmit={formAction}>
        <Button
          isIconOnly
          aria-label="Like"
          isLoading={isProcessing}
          size="sm"
          type="submit"
          variant="light"
        >
          <HeartIcon color={isLiked ? "red" : "white"} />
        </Button>
      </form>
      <p className="text-xl">{likeCount}</p>
    </div>
  );
}
