"use client";

import { Button } from "@nextui-org/button";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/modal";
import { ReactNode, useState } from "react";

import { deleteGameTemplateAction } from "@/app/lib/actions";
import { constants } from "@/app/lib/utils/path";

export function GameTemplateDeleteButton({
  userId,
  templateId,
  children,
}: {
  userId: number;
  templateId: number;
  children?: ReactNode;
}) {
  const router = useRouter();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [deleteInProgress, setDeleteInProgress] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const onDelete = async () => {
    setDeleteInProgress(true);

    const result = await deleteGameTemplateAction({
      userId,
      templateId,
    });

    if (result.success) {
      // successfully deleted the game session;
      // redirect to the game sessions dashboard page
      router.push(constants.gameTemplatesDashboardPagePath);
    } else {
      setError(result.error);
    }

    setDeleteInProgress(false);
  };

  return (
    <>
      <Button color="danger" radius="full" variant="bordered" onPress={onOpen}>
        {children}
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalBody>
                <p>
                  你确定要删除这个游戏模板吗？{" "}
                  <text className="text-red-500 font-bold">
                    删了可就回不来了！你的点赞、评论和其他可以炫耀的东西也回不来了！
                  </text>
                </p>
              </ModalBody>
              <ModalFooter>
                <div className="flex flex-col w-full">
                  <div className="flex flex-row justify-end space-x-2">
                    <Button
                      color="danger"
                      isLoading={deleteInProgress}
                      variant="bordered"
                      onPress={async (e) => {
                        await onDelete();
                      }}
                    >
                      删
                    </Button>
                    <Button color="primary" onPress={onClose}>
                      不删
                    </Button>
                  </div>
                  {error && (
                    <p className="line-clamp-1 text-red-500">{error}</p>
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
