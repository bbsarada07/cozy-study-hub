import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STORE_ITEMS } from "@/hooks/useUnlocks";
import { Lock, Unlock, Star, Sparkles } from "lucide-react";

interface StoreModalProps {
  open: boolean;
  onClose: () => void;
  totalPoints: number;
  isUnlocked: (id: string) => boolean;
  onUnlock: (item: typeof STORE_ITEMS[number]) => void;
  recommendation?: typeof STORE_ITEMS[number] | null;
}

const StoreModal = ({ open, onClose, totalPoints, isUnlocked, onUnlock, recommendation }: StoreModalProps) => {
  const maxCost = Math.max(...STORE_ITEMS.map(i => i.cost));
  const unlockedCount = STORE_ITEMS.filter(i => isUnlocked(i.id)).length;
  const progressPercent = (unlockedCount / STORE_ITEMS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            🏪 Study Store
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <Star className="h-4 w-4 text-accent" /> You have <strong className="text-foreground">{totalPoints}</strong> points
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{unlockedCount}/{STORE_ITEMS.length} unlocked</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Recommendation */}
        {recommendation && !isUnlocked(recommendation.id) && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <Sparkles className="h-3.5 w-3.5" /> Recommended Next
            </div>
            <p className="text-xs text-muted-foreground">
              {recommendation.emoji} <strong className="text-foreground">{recommendation.name}</strong> — {recommendation.cost} pts
            </p>
          </div>
        )}

        <div className="space-y-3">
          {STORE_ITEMS.map((item) => {
            const unlocked = isUnlocked(item.id);
            const canAfford = totalPoints >= item.cost;
            const isFree = item.cost === 0;

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
                    {!unlocked && !isFree && (
                      <div className="mt-2">
                        <Progress
                          value={Math.min((totalPoints / item.cost) * 100, 100)}
                          className="h-1"
                        />
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {totalPoints}/{item.cost} pts
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {unlocked || isFree ? (
                      <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        <Unlock className="h-3 w-3" /> {isFree ? "Free" : "Unlocked"}
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
