-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "backstory" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageUrlExpiration" TIMESTAMP(3),
    "imageDescription" TEXT NOT NULL,
    "creationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletionTimestamp" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" SERIAL NOT NULL,
    "imagePath" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageUrlExpiration" TIMESTAMP(3),
    "imageDescription" TEXT NOT NULL,
    "narration" TEXT NOT NULL,
    "action" TEXT,
    "orderInSession" INTEGER NOT NULL,
    "generationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletionTimestamp" TIMESTAMP(3),
    "actionTimestamp" TIMESTAMP(3),
    "gameSessionId" INTEGER NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "backstory" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT NOT NULL,
    "imageDescription" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageUrlExpiration" TIMESTAMP(3),
    "creationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletionTimestamp" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "GameTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplateLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "gameTemplateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletionTimestamp" TIMESTAMP(3),

    CONSTRAINT "GameTemplateLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletionTimestamp" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "gameTemplateId" INTEGER NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GameTemplateLike_userId_gameTemplateId_key" ON "GameTemplateLike"("userId", "gameTemplateId");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplate" ADD CONSTRAINT "GameTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplateLike" ADD CONSTRAINT "GameTemplateLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplateLike" ADD CONSTRAINT "GameTemplateLike_gameTemplateId_fkey" FOREIGN KEY ("gameTemplateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_gameTemplateId_fkey" FOREIGN KEY ("gameTemplateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
