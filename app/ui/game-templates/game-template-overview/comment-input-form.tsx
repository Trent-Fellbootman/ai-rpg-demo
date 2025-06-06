"use client";

import { Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Spacer } from "@nextui-org/spacer";
import React, { useState } from "react";

import {
  postCommentAction,
  PostCommentActionResponse,
} from "@/app/lib/actions";

export function CommentInputForm({
  userId,
  gameTemplateId,
}: {
  userId: number;
  gameTemplateId: number;
}) {
  const [responseState, setResponseState] = useState<
    PostCommentActionResponse | undefined
  >(undefined);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>("");

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsProcessingAction(true);
    setResponseState(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await postCommentAction(userId, gameTemplateId, formData);

    setResponseState(response);
    if (!response.errors) {
      setCommentText("");
    }
    setIsProcessingAction(false);
  };

  return (
    <form onSubmit={formAction}>
      <div className="flex flex-col">
        <Textarea
          label="评论内容"
          name="text"
          placeholder="输入评论..."
          value={commentText}
          onValueChange={(newValue) => setCommentText(newValue)}
        />
        {responseState?.errors?.fieldErrors?.text &&
          responseState?.errors.fieldErrors.text.map((e, index) => (
            <p key={index} className="text-red-500">
              {e}
            </p>
          ))}
        <Spacer y={1} />
        <div className="flex flex-row justify-end">
          <Button
            color="primary"
            isLoading={isProcessingAction}
            type="submit"
            variant="solid"
          >
            发布评论
          </Button>
        </div>
      </div>
    </form>
  );
}
