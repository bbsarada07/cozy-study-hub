import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STORE_ITEMS } from "@/hooks/useUnlocks";
import { Lock, Unlock, Star } from "lucide-react";

interface StoreModalProps {
  open: boolean;
  onClose: () => void;
  totalPoints: number;
  isUnlocked: (id: string) => boolean;
  onUnlock: (item: typeof STORE_ITEMS[number]) => void;
}

const StoreModal = ({ open, onClose, totalPoints, isUnlocked, onUnlock }: StoreModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            🏪 Study Store
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <Star className="h-4 w-4 text-accent" /> You have <strong className="text-foreground">{totalPoints}</strong> points
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {STORE_ITEMS.map((item) => {
            const unlocked = isUnlocked(item.id);
            const canAfford = totalPoints >= item.cost;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-all ${
                  unlocked
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <span className="text-lg">{item.emoji}</span>
                      {item.name}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {unlocked ? (
                      <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        <Unlock className="h-3 w-3" /> Unlocked
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canAfford}
                        onClick={() => onUnlock(item)}
                        className="gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        {item.cost} pts
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreModal;
