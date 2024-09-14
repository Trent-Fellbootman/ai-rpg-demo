export const constants = {
  loginPagePath: "/login",
  signupPagePath: "/signup",
  gamePagesRootPath: "/games",
  dashboardPagePath: "/games",
  newSessionPagePath: "/games/new",
};

/**
 * Constructs the path to the scene page.
 * @param sessionId
 * @param sceneIndex If null, go to the last scene
 */
export function getScenePlayPagePath(
  sessionId: string,
  sceneIndex: number | null,
) {
  return `${constants.gamePagesRootPath}/${sessionId}/play/${sceneIndex === null ? "last" : sceneIndex}`;
}

export function getSessionViewPath(session: string) {
  return `${constants.gamePagesRootPath}/${session}/view`;
}
