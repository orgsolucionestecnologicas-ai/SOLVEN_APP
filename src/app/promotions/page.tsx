import { AppShell } from "../ui/app-shell";
import { PromotionsList } from "../ui/promotions";

export default function PromotionsPage() {
  return (
    <AppShell activeSection="promotions">
      <PromotionsList />
    </AppShell>
  );
}
