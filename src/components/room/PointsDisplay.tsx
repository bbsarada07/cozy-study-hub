import { Star } from "lucide-react";

interface PointsDisplayProps {
  points: number;
  streak: number;
  onClick: () => void;
}

const PointsDisplay = ({ points, streak, onClick }: PointsDisplayProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent/30"
    >
      <Star className="h-4 w-4 text-accent" />
      <span>{points}</span>
      {streak > 0 && (
        <span className="text-xs text-muted-foreground">🔥{streak}</span>
      )}
    </button>
  );
};

export default PointsDisplay;
