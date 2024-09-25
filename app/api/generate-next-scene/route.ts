import { getCurrentUser } from "@/app/lib/database-actions/user-actions";
import { GenerateNextSceneDataInProgressUpdate } from "@/app/lib/data-generation/generate-next-scene-data";
import { createNextSceneAction } from "@/app/lib/actions";
import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "generate-next-scene-api" });

export async function GET(req: Request) {
  const user = await getCurrentUser();

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const action = url.searchParams.get("action");

  return new Response(
    new ReadableStream({
      start(controller) {
        const sendEvent = (data: {
          error?: string;
          inProgressUpdateEvent?: GenerateNextSceneDataInProgressUpdate;
        }) => {
          try {
            const sseFormattedData = `data: ${JSON.stringify(data)}\n\n`;

            controller.enqueue(sseFormattedData);
          } catch (error) {
            log.error(error, "Error sending event");
          }
        };

        const processSteps = async () => {
          try {
            if (!sessionId) {
              throw new Error("Session ID must not be null!");
            }

            const parsedSessionId = parseInt(sessionId);

            if (isNaN(parsedSessionId)) {
              throw new Error("Session ID must be a number!");
            }

            if (!action) {
              throw new Error("Action must not be null!");
            }

            if (action === "") {
              throw new Error("Action must not be empty!");
            }

            await createNextSceneAction({
              userId: user.id,
              sessionId: parsedSessionId,
              action,
              onInProgressUpdate: (inProgressUpdateEvent) => {
                sendEvent({ inProgressUpdateEvent: inProgressUpdateEvent });
              },
            });
          } catch (error) {
            sendEvent({
              error: `An error occurred when generating next scene: ${error}`,
            });
          } finally {
            controller.close(); // Close the stream after completion
          }
        };

        processSteps();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
}
