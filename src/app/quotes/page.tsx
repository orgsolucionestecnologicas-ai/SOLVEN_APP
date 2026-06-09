import { AppShell } from "../ui/app-shell";
import { QuotesList } from "../ui/quotes-list";

export default function QuotesPage() {
  return (
    <AppShell activeSection="quotes">
      <QuotesList />
    </AppShell>
  );
}
