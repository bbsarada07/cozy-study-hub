import { useState } from "react";
import { CheckSquare, Square, Clock, Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { format } from "date-fns";

const FONT = "'Times New Roman', Times, serif";

type TaskStatus = "todo" | "in_progress" | "done";

export interface BoardTask {
  id: number;
  text: string;
  priority: "high" | "medium" | "low";
  status: TaskStatus;
  detectedDate?: Date;
  suggestedTime?: string;
  estimatedDuration?: string;
}

interface TaskBoardProps {
  tasks: BoardTask[];
  onUpdateTasks: (tasks: BoardTask[]) => void;
}

const priorityColor = (p: string) => {
  if (p === "high") return "hsl(0, 70%, 45%)";
  if (p === "medium") return "hsl(36, 70%, 42%)";
  return "hsl(120, 30%, 38%)";
};

const priorityLabel = (p: string) => {
  if (p === "high") return "High";
  if (p === "medium") return "Medium";
  return "Low";
};

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  todo: {
    label: "To Do",
    color: "hsl(25, 50%, 15%)",
    bgColor: "hsla(25, 20%, 92%, 0.95)",
    dotColor: "hsl(25, 40%, 55%)",
  },
  in_progress: {
    label: "In Progress",
    color: "hsl(170, 55%, 25%)",
    bgColor: "hsla(170, 40%, 92%, 0.95)",
    dotColor: "hsl(170, 55%, 42%)",
  },
  done: {
    label: "Done",
    color: "hsl(36, 70%, 30%)",
    bgColor: "hsla(45, 60%, 90%, 0.95)",
    dotColor: "hsl(36, 70%, 50%)",
  },
};

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const TaskBoard = ({ tasks, onUpdateTasks }: TaskBoardProps) => {
  const moveTask = (id: number) => {
    onUpdateTasks(
      tasks.map((t) => (t.id === id ? { ...t, status: nextStatus[t.status] } : t))
    );
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const total = tasks.length;
  const doneCount = doneTasks.length;
  const inProgressCount = inProgressTasks.length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const columns: { key: TaskStatus; tasks: BoardTask[] }[] = [
    { key: "todo", tasks: todoTasks },
    { key: "in_progress", tasks: inProgressTasks },
    { key: "done", tasks: doneTasks },
  ];

  return (
    <div
      className="mx-auto mt-5 w-full max-w-lg rounded-2xl p-4 shadow-xl"
      style={{
        backgroundColor: "hsla(40, 30%, 96%, 0.95)",
        border: "1px solid hsla(25, 20%, 80%, 0.5)",
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5" style={{ color: "hsl(36, 70%, 42%)" }} />
        <h2
          className="text-lg font-extrabold"
          style={{ fontFamily: FONT, color: "hsl(25, 50%, 12%)" }}
        >
          Task Board
        </h2>
      </div>

      {/* Progress bar */}
      <div className="mb-5 rounded-xl px-3 py-3" style={{ backgroundColor: "hsla(40, 20%, 94%, 0.9)", border: "1px solid hsla(25, 20%, 85%, 0.4)" }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: "hsl(36, 70%, 42%)" }} />
            <span className="text-sm font-bold" style={{ fontFamily: FONT, color: "hsl(25, 50%, 12%)" }}>
              Progress
            </span>
          </div>
          <span className="text-sm font-extrabold" style={{ fontFamily: FONT, color: "hsl(170, 55%, 30%)" }}>
            {progressPercent}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: "hsla(25, 15%, 85%, 0.6)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent === 100
                ? "linear-gradient(90deg, hsl(120, 40%, 45%), hsl(120, 50%, 55%))"
                : "linear-gradient(90deg, hsl(170, 55%, 42%), hsl(36, 70%, 50%))",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold" style={{ fontFamily: FONT, color: "hsl(25, 30%, 40%)" }}>
          <span>{doneCount} done</span>
          <span>{inProgressCount} in progress</span>
          <span>{todoTasks.length} to do</span>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="space-y-4">
        {columns.map(({ key, tasks: colTasks }) => {
          const config = statusConfig[key];
          return (
            <div key={key}>
              {/* Column header */}
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.dotColor }} />
                <span className="text-sm font-extrabold" style={{ fontFamily: FONT, color: config.color }}>
                  {config.label}
                </span>
                <span
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: config.bgColor, color: config.color }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks */}
              {colTasks.length === 0 ? (
                <div
                  className="rounded-xl border-2 border-dashed px-4 py-3 text-center text-xs font-semibold"
                  style={{ borderColor: "hsla(25, 20%, 80%, 0.5)", color: "hsl(25, 20%, 60%)", fontFamily: FONT }}
                >
                  No tasks here
                </div>
              ) : (
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl px-3 py-3 shadow-sm transition-all"
                      style={{
                        backgroundColor: config.bgColor,
                        border: `1px solid hsla(25, 20%, 82%, 0.5)`,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`flex-1 text-[14px] font-bold ${key === "done" ? "line-through opacity-50" : ""}`}
                          style={{ fontFamily: FONT, color: "hsl(25, 55%, 10%)" }}
                        >
                          {task.text}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: priorityColor(task.priority), color: "hsl(0, 0%, 100%)" }}
                        >
                          {priorityLabel(task.priority)}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {task.suggestedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" style={{ color: "hsl(36, 70%, 42%)" }} />
                            <span className="text-[11px] font-semibold" style={{ fontFamily: FONT, color: "hsl(25, 50%, 25%)" }}>
                              {task.suggestedTime}
                            </span>
                          </div>
                        )}
                        {task.estimatedDuration && (
                          <span className="text-[11px] font-semibold" style={{ fontFamily: FONT, color: "hsl(25, 40%, 35%)" }}>
                            ⏱ {task.estimatedDuration}
                          </span>
                        )}
                        {task.detectedDate && (
                          <span className="text-[11px] font-semibold" style={{ fontFamily: FONT, color: "hsl(0, 60%, 40%)" }}>
                            📅 {format(task.detectedDate, "MMM d")}
                          </span>
                        )}
                      </div>

                      {/* Move button */}
                      <button
                        onClick={() => moveTask(task.id)}
                        className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-all hover:scale-105"
                        style={{
                          backgroundColor: "hsla(36, 70%, 50%, 0.15)",
                          color: "hsl(36, 70%, 35%)",
                          fontFamily: FONT,
                        }}
                      >
                        Move to {statusConfig[nextStatus[key]].label}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;
