// Test-only module resolution: maps the "@/" alias and swaps framework/IO modules for stubs.
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
