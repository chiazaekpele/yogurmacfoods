import type { SetbackCategory, TaskStatus } from "@/generated/prisma/enums";

// Display labels shared across portal pages (browser-safe).
export const SETBACK_LABELS: Record<SetbackCategory, string> = {
  INGREDIENT_SHORTAGE: "Ingredient shortage",
  EQUIPMENT_ISSUE: "Equipment issue",
  PACKAGING_ISSUE: "Packaging issue",
  OTHER: "Other",
};

export const TASK_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};
