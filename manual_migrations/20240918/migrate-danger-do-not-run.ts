const { createServerClient } = require("@supabase/ssr");
const { sql } = require("@vercel/postgres");
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // create supabase client
  const oldSupabase = createServerClient(
    process.env.CURRENT_NEXT_PUBLIC_SUPABASE_URL!,
    process.env.CURRENT_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => null,
        setAll: async (
          cookies: { name: string; value: string; options: any }[],
        ) => {},
      },
    },
  );

  const newSupabase = createServerClient(
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

  console.log("Fetching postgresql data...");

  const [usersResult, scenesResult, game_sessionsResult] = (
    await Promise.all([
      sql<{
        user_id: string;
        email: string;
        hashed_password: string;
      }>`select * from user_credentials_table`,
      sql<{
        scene_id: string;
        session_id: string;
        text: string;
        image_storage_path: string;
        image_description: string;
        action: string;
        scene_order: number;
      }>`select * from scenes_table`,
      await sql<{
        session_id: string;
        user_id: string;
        session_name: string;
        initial_setup: string;
        is_locked: boolean;
      }>`select * from game_sessions_table`,
    ])
  ).map((item) => item.rows);

  const users = usersResult as {
    user_id: string;
    email: string;
    hashed_password: string;
  }[];

  const scenes = scenesResult as {
    scene_id: string;
    session_id: string;
    text: string;
    image_storage_path: string;
    image_description: string;
    action: string;
    scene_order: number;
  }[];

  const game_sessions = game_sessionsResult as {
    session_id: string;
    user_id: string;
    session_name: string;
    initial_setup: string;
    is_locked: boolean;
  }[];

  console.log("Fetching image metadatas...");

  const { data, error } = await oldSupabase.storage
    .from("images-storage")
    .list("", { limit: 1000 });

  const imageFilepaths: string[] = data!.map((item: any, _: any) => item.name);

  console.log("Creating users...");

  // first create users
  const createdUsers = await Promise.all(
    users.map((user) =>
      prisma.user.create({
        data: {
          email: user.email,
          hashedPassword: user.hashed_password,
        },
        select: {
          id: true,
          email: true,
        },
      }),
    ),
  );

  const userIdMapping: Map<string, number> = new Map();

  for (const user of createdUsers) {
    userIdMapping.set(
      users.filter((u) => u.email === user.email)[0].user_id,
      user.id,
    );
  }

  console.log("Creating sessions...");

  const scenesByGameSessions: Map<
    string,
    {
      scene_id: string;
      session_id: string;
      text: string;
      image_storage_path: string;
      image_description: string;
      action: string;
      scene_order: number;
    }[]
  > = new Map();

  for (const session of game_sessions) {
    scenesByGameSessions.set(
      session.session_id,
      scenes
        .filter((s) => s.session_id === session.session_id)
        .sort((s1, s2) => s1.scene_order - s2.scene_order),
    );
  }

  const sessionIdMapping: Map<string, number> = new Map();

  const createdSessions = await Promise.all(
    game_sessions.map((session) =>
      (async () => {
        const firstScene = scenesByGameSessions.get(session.session_id)![0];
        const { id } = await prisma.gameSession.create({
          data: {
            name: session.session_name,
            backstory: session.initial_setup,
            userId: userIdMapping.get(session.user_id)!,
            imageDescription: firstScene.image_description,
            imagePath: firstScene.image_storage_path,
          },
          select: {
            id: true,
          },
        });

        return {
          session_id: session.session_id,
          id: id,
        };
      })(),
    ),
  );

  for (const session of createdSessions) {
    sessionIdMapping.set(session.session_id, session.id);
  }

  console.log("Creating scenes...");

  // then create scenes
  await prisma.scene.createMany({
    data: scenes.map((scene) => {
      return {
        gameSessionId: sessionIdMapping.get(scene.session_id)!,
        imageDescription: scene.image_description,
        imagePath: scene.image_storage_path,
        narration: scene.text,
        orderInSession: scene.scene_order,
        actionTimestamp: scene.action === "" ? null : new Date(),
        action: scene.action === "" ? null : scene.action,
      };
    }),
  });

  console.log("Downloading and uploading images...");

  // then migrate the images
  await Promise.all(
    imageFilepaths.map((filepath) =>
      (async () => {
        while (true) {
          try {
            const { data, error } = await oldSupabase.storage
              .from("images-storage")
              .download(filepath);

            if (error) {
              throw new Error(
                `Error downloading image: "${error.message}". Retrying...`,
              );
            }

            // upload image
            const { data: uploadData, error: uploadError } =
              await newSupabase.storage
                .from("images-storage")
                .upload(filepath, data!);

            if (uploadError) {
              throw new Error(
                `Error uploading image: "${uploadError.message}". Retrying...`,
              );
            }

            break;
          } catch (error) {
            console.log(
              `Error downloading & uploading image: "${(error as Error).message}". Retrying...`,
            );
            continue;
          }
        }
      })(),
    ),
  );

  console.log("Data migration complete.");
}

main().catch((error) => {
  console.error(error);
});
