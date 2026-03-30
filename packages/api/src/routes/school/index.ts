import { Hono } from "hono";
import type { SchoolEnv } from "../../middleware/school";

import { settingsRouter }   from "./settings";
import { studentsRouter }   from "./students";
import { teachersRouter }   from "./teachers";
import { attendanceRouter } from "./attendance";
import { timetableRouter }  from "./timetable";
import { behaviorRouter }   from "./behavior";

const app = new Hono<SchoolEnv>();

app.route("/", settingsRouter);
app.route("/", studentsRouter);
app.route("/", teachersRouter);
app.route("/", attendanceRouter);
app.route("/", timetableRouter);
app.route("/", behaviorRouter);

export const schoolRouter = app;
