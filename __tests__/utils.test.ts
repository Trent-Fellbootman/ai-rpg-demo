import { describe, test, expect } from "vitest";

import { splitString } from "@/app/lib/utils/string-operations";

describe("Utils", () => {
  test.concurrent("should split complete and incomplete segments", () => {
    expect(
      splitString("<action>test action</action>", "<action>", "</action>"),
    ).toEqual([{ type: "complete", content: "test action" }]);

    expect(
      splitString(
        "   -start  Adorable-endcadudas-sta         ",
        "-start",
        "-end",
      ),
    ).toEqual([{ type: "complete", content: "  Adorable" }]);

    expect(
      splitString("-startAdorable-end-startcute-e", "-start", "-end"),
    ).toEqual([
      { type: "complete", content: "Adorable" },
      { type: "incomplete", content: "cute-e" },
    ]);

    expect(
      splitString(
        "-startAdorable-end-startcute-end   -startsom",
        "-start",
        "-end",
      ),
    ).toEqual([
      { type: "complete", content: "Adorable" },
      { type: "complete", content: "cute" },
      { type: "incomplete", content: "som" },
    ]);

    expect(
      splitString(
        `
<action>
Throw your smartphone at the nearest zombie to distract it while you make your escape.
</action>
<action>
Grab a nearby pillow and use it as a makeshift shield while you attempt to sneak past the growing horde.
</action>
<action>
Yell out your crush's name in a dramatic fashion to see if he answers back amidst the chaos.
</action>
<action>
Find a hairpin and attempt to fashion it into a shiv, channeling your inner post-apocalyptic survivalist.
</action>
`,
        "<action>",
        "</action>",
      ).map((e) => {
        return { type: e.type, content: e.content.trim() };
      }),
    ).toEqual([
      {
        type: "complete",
        content:
          "Throw your smartphone at the nearest zombie to distract it while you make your escape.",
      },
      {
        type: "complete",
        content:
          "Grab a nearby pillow and use it as a makeshift shield while you attempt to sneak past the growing horde.",
      },
      {
        type: "complete",
        content:
          "Yell out your crush's name in a dramatic fashion to see if he answers back amidst the chaos.",
      },
      {
        type: "complete",
        content:
          "Find a hairpin and attempt to fashion it into a shiv, channeling your inner post-apocalyptic survivalist.",
      },
    ]);
  });
});
