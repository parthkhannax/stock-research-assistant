/**
 * InstantDB Client Initialization
 *
 * To set up:
 * 1. Go to https://instantdb.com
 * 2. Create a new app
 * 3. Copy the APP_ID
 * 4. Add to .env.local as VITE_INSTANT_APP_ID
 * 5. Upload schema and permissions from instant.schema.ts and instant.perms.ts
 */

import { init } from "@instantdb/react";
import schema from "./instant.schema";

// Initialize InstantDB client
const APP_ID = import.meta.env.VITE_INSTANT_APP_ID || "";

if (!APP_ID) {
  console.error("⚠️ InstantDB APP_ID not configured. Please set VITE_INSTANT_APP_ID in .env.local");
}

export const db = init({ appId: APP_ID, schema });

// Export auth methods for convenience
export const { useAuth } = db;
