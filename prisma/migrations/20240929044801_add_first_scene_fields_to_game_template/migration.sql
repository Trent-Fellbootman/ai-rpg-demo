-- AlterTable
ALTER TABLE "GameTemplate" ADD COLUMN     "firstSceneEvent" TEXT NOT NULL DEFAULT 'Placeholder first scene event',
ADD COLUMN     "firstSceneImageDescription" TEXT NOT NULL DEFAULT 'Placeholder first scene image description',
ADD COLUMN     "firstSceneImagePath" TEXT NOT NULL DEFAULT 'Placeholder first scene image path',
ADD COLUMN     "firstSceneNarration" TEXT NOT NULL DEFAULT 'Placeholder first scene narration',
ADD COLUMN     "firstSceneProposedActions" TEXT[] DEFAULT ARRAY['Placeholder first scene proposed action']::TEXT[];
