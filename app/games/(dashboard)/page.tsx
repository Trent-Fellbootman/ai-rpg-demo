import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import GameCardsView from "@/app/ui/dashboard/game-cards-view";
import { constants } from "@/app/lib/utils/path";

export default function DashboardPage() {
  return (
    <div>
      <GameCardsView />
    </div>
  );
}
