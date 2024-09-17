import { deleteEverything } from "./vitest-setup-utils";

export async function setup() {
    await deleteEverything();
}

export async function teardown() {
    await deleteEverything();
}
