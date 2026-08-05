export type ExerciseIntensity = "easy" | "moderate" | "high";
export type ExerciseFeeling = "great" | "normal" | "tired";

export interface ExerciseType {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseRecord {
  id: string;
  typeId: string;
  exerciseDate: string;
  startTime?: string;
  durationMinutes: number | null;
  location?: string;
  intensity?: ExerciseIntensity;
  feeling?: ExerciseFeeling;
  note?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSettings {
  version: 1;
  calendarMonth: string;
}

export interface ExerciseData {
  version: 1;
  types: ExerciseType[];
  records: ExerciseRecord[];
  settings: ExerciseSettings;
}

export interface ExerciseRecordInput {
  typeId: string;
  exerciseDate: string;
  startTime: string;
  durationMinutes: string;
  location: string;
  intensity: ExerciseIntensity | "";
  feeling: ExerciseFeeling | "";
  note: string;
  imageUrl: string;
}

export interface ExerciseDaySummary {
  date: string;
  count: number;
  durationMinutes: number;
}

export interface ExerciseTypeBreakdown {
  typeId: string;
  name: string;
  icon: string;
  count: number;
  percentage: number;
}

export interface ExerciseWeekTrend {
  label: string;
  count: number;
}

export interface ExerciseStats {
  todayCount: number;
  todayDuration: number;
  weekCount: number;
  weekDuration: number;
  monthCount: number;
  monthDuration: number;
  totalCount: number;
  totalDuration: number;
  streak: number;
  monthActiveDays: number;
  mostFrequentType?: ExerciseTypeBreakdown;
  latestRecord?: ExerciseRecord;
  typeBreakdown: ExerciseTypeBreakdown[];
  weekTrend: ExerciseWeekTrend[];
}
