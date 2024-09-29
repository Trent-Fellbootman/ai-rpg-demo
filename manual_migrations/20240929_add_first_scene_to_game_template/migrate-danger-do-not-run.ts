const { createServerClient } = require("@supabase/ssr");
const { PrismaClient } = require("@prisma/client");
const { v4 } = require("uuid");
const dotenv = require("dotenv");

const uuidv4 = v4;

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => null,
        setAll: async (
          cookies: { name: string; value: string; options: any }[],
        ) => {},
      },
    },
  );

  const gameTemplates = await prisma.gameTemplate.findMany({
    include: {
      childGameSessions: {
        include: {
          scenes: true,
        },
      },
    },
  });

  for (const template of gameTemplates) {
    if (template.childGameSessions.length === 0) {
      throw new Error(
        `Game template ${template.id} has no child game sessions`,
      );
    }

    if (template.childGameSessions[0].scenes.length === 0) {
      throw new Error(
        `Game template ${template.id} has no scenes in its first game session`,
      );
    }
  }

  await Promise.all(
    gameTemplates.map((template: any) =>
      (async () => {
        const firstSession = template.childGameSessions[0]; // Get the first game session
        const firstScene = firstSession.scenes[0]; // Get the first scene of that session

        const newImagePath = `${uuidv4()}.${firstScene.imagePath.split(".").pop() as string}`;
        const { data, error } = await supabase.storage
          .from("images-storage")
          .copy(firstScene.imagePath, newImagePath);

        if (error) {
          console.error(`Failed to copy image ${firstScene.imagePath}`, error);
        }

        await prisma.gameTemplate.update({
          where: { id: template.id },
          data: {
            firstSceneEvent: firstScene.event,
            firstSceneImagePath: newImagePath,
            firstSceneImageDescription: firstScene.imageDescription,
            firstSceneNarration: firstScene.narration,
            firstSceneProposedActions: firstScene.proposedActions,
          },
        });
      })(),
    ),
  );

  console.log("All operations successful.");
}

main().catch((error) => {
  console.error(error);
});
