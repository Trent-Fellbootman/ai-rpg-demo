import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import GameCardsView from "@/app/ui/dashboard/game-cards-view";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex justify-end">
        <Button as={Link} color="primary" href="/games/new">
          New Session
        </Button>
      </div>
      <GameCardsView />
    </div>
  );
}
