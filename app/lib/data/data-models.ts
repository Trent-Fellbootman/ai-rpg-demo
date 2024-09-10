export type UserCredentials = {
  userId: string;
  email: string;
  hashedPassword: string;
};

export type Scene = {
  text: string;
  imageUrl: string;
  action: string;
};

export type GameSessionMetadata = {
  sessionId: string;
  sessionName: string;
  backStory: string;
};
