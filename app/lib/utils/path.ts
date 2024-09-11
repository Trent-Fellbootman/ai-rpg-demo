export const constants = {
  loginPagePath: "/login",
  signupPagePath: "/signup",
  gamePagesRootPath: "/games",
  dashboardPagePath: "/games",
};

/**
 * Constructs the path to the scene page.
 * @param sessionId
 * @param sceneIndex If null, go to the last scene
 */
export function getScenePagePath(sessionId: string, sceneIndex: number | null) {
  return `${constants.gamePagesRootPath}/${sessionId}/play/${sceneIndex === null ? "last" : sceneIndex}`;
}
