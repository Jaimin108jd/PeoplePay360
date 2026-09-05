/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attendance from "../attendance.js";
import type * as contracts from "../contracts.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as departments from "../departments.js";
import type * as employees from "../employees.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_payroll_engine from "../lib/payroll_engine.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_timeOffCalculation from "../lib/timeOffCalculation.js";
import type * as privateData from "../privateData.js";
import type * as salaryStructures from "../salaryStructures.js";
import type * as seed from "../seed.js";
import type * as timeOffAllocations from "../timeOffAllocations.js";
import type * as timeOffRequests from "../timeOffRequests.js";
import type * as timeOffTypes from "../timeOffTypes.js";
import type * as users from "../users.js";
import type * as workingSchedules from "../workingSchedules.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attendance: typeof attendance;
  contracts: typeof contracts;
  crons: typeof crons;
  dashboard: typeof dashboard;
  departments: typeof departments;
  employees: typeof employees;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/payroll_engine": typeof lib_payroll_engine;
  "lib/rbac": typeof lib_rbac;
  "lib/timeOffCalculation": typeof lib_timeOffCalculation;
  privateData: typeof privateData;
  salaryStructures: typeof salaryStructures;
  seed: typeof seed;
  timeOffAllocations: typeof timeOffAllocations;
  timeOffRequests: typeof timeOffRequests;
  timeOffTypes: typeof timeOffTypes;
  users: typeof users;
  workingSchedules: typeof workingSchedules;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
