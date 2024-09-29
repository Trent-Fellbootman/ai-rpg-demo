export const constants = {
  loginPagePath: "/login",
  signupPagePath: "/signup",
  homePagePath: "/games/home",
  gamePagesRootPath: "/games",
  gameSessionsPagesRootPath: "/games/sessions",
  gameSessionsDashboardPagePath: "/games/sessions",
  newSessionPagePath: "/games/sessions/new",
  gameTemplatesPagesRootPath: "/games/templates",
  gameTemplatesDashboardPagePath: "/games/templates",
  generateNextSceneApiPath: "/api/generate-next-scene",
};

/**
 * Constructs the path to the scene page.
 * @param sessionId
 * @param sceneIndex If null, go to the last scene
 */
export function getScenePlayPagePath(
  sessionId: number,
  sceneIndex: number | null,
) {
  return `${constants.gameSessionsPagesRootPath}/${sessionId}/play/${sceneIndex === null ? "last" : sceneIndex}`;
}

export function getSessionViewPath(sessionId: number) {
  return `${constants.gameSessionsPagesRootPath}/${sessionId}/view`;
}

export function getSessionOverviewPath(sessionId: number) {
  return `${constants.gameSessionsPagesRootPath}/${sessionId}`;
}

export function getTemplateOverviewPath(templateId: number) {
  return `${constants.gameTemplatesPagesRootPath}/${templateId}`;
}

export function getTemplateEditPath(templateId: number) {
  return `${constants.gameTemplatesPagesRootPath}/${templateId}/edit`;
}
