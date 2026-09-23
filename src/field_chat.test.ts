import assert from "node:assert/strict";
import { z } from "zod";

const followUp = z.object({ dispatchStatus: z.enum(["assigned", "en_route", "on_site", "complete"]), photoUrl: z.string().url() });
const accepted = followUp.parse({ dispatchStatus: "on_site", photoUrl: "https://example.com/panel.jpg" });
assert.equal(accepted.dispatchStatus, "on_site");
assert.throws(() => followUp.parse({ dispatchStatus: "paused", photoUrl: "https://example.com/panel.jpg" }));
console.log("follow-up validation accepts an on-site update and rejects unknown dispatch states");
