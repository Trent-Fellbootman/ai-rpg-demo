import { redirect } from "next/navigation";

import { constants } from "@/app/lib/utils/path";

export default function Page() {
  redirect(constants.dashboardPagePath);
}
