export type UserCredentialsTableType = {
  user_id: string;
  email: string;
  hashed_password: string;
};

export type SceneTableType = {
  scene_id: string;
  session_id: string;
  text: string;
  image_url: string;
  action: string;
  order: number;
};

export type GameSessionMetadataTableType = {
  session_id: string;
  user_id: string;
  session_name: string;
};
