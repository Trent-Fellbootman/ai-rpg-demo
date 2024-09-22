export const promptConstants = {
  gameMechanicsDescription: `The game works in a turn-based way.
There are an ordered list of scenes;
at each turn, the player takes an action and a new scene is generated from that action,
while looking at the previous scenes to determine what should happen next.`,
  firstSceneOracleEventFieldDescription: `A description of what happened in the first scene.
Such a description is written from an "oracle" perspective.
Include both what the player can and cannot see.`,
  firstSceneImagePromptFieldDescription: `An ENGLISH prompt for generating the first scene image of the game.
Specify as many details as possible, ("describe like you've never described an image before"),
such as lighting environment, object shape, style, etc.
The goal is to embed all information in the image into this text prompt,
because later on, another AI will look at the prompt and generate image for another scene.
If you fail to specify the details, images for different scenes will likely be INCOHERENT
(e.g., the look of the character suddenly differ).
The player is playing the game from a FIRST-PERSON perspective;
he/she should NOT be able to see his/her body (unless looking in a mirror or something)`,
  firstSceneTextPromptFieldDescription: `A BRIEF description of the current situation of the player,
e.g., "You wake up on a deserted island. There are distant groans from afar."
This will be presented to the player who does not like reading through long texts.
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.
DO NOT include things that the play can see from the image.`
}