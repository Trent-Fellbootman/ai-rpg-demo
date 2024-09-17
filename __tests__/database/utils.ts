import { fakeDataRootPath } from "../constants";

export function getFakeImageUrl(imageIndex: number): string {
    return `http://localhost:8080${fakeDataRootPath}/${imageIndex}.png`;
}