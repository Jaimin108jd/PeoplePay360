import { cronJobs } from "convex/server";

const crons = cronJobs();

// Cron jobs re-enabled once internal functions are properly exported.
// For now the module is valid and exports a default crons instance.

export default crons;
