/**
 * Education Engine
 *
 * Owns: School domain (school.ts is being decomposed into this engine)
 * Business types: school
 *
 * school.ts (242KB) is TOO LARGE for a single file.
 * This engine will host the decomposed modules.
 *
 * Decomposition plan:
 *   education/students.ts   — student CRUD, import, profiles
 *   education/teachers.ts   — teacher CRUD, profiles, schedules
 *   education/attendance.ts — daily attendance, reports
 *   education/behavior.ts   — violations, cases, counseling
 *   education/timetable.ts  — class schedules, subjects
 *   education/dashboard.ts  — KPIs, day monitor
 *
 * Current status: delegation to legacy school.ts
 * Migration: decompose school.ts incrementally into these modules
 */

import { Hono } from "hono";

// Sub-modules (will be populated as school.ts is decomposed)
// import { studentsRouter }   from "./students";
// import { teachersRouter }   from "./teachers";
// import { attendanceRouter } from "./attendance";
// import { behaviorRouter }   from "./behavior";
// import { timetableRouter }  from "./timetable";
// import { dashboardRouter }  from "./dashboard";

export const educationEngine = new Hono();

educationEngine.get("/", (c) => c.json({
  engine: "education",
  status: "decomposition_pending",
  legacyRoute: "/api/v1/school/*",
  modules: [
    "students",
    "teachers",
    "attendance",
    "behavior",
    "timetable",
    "dashboard",
  ],
}));
