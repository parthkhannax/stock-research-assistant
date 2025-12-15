// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      displayName: i.string().optional(),
      joinedAt: i.number().optional(),
    }),

    // User watchlists
    watchlists: i.entity({
      name: i.string(),
      description: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
      color: i.string().optional(), // For UI categorization (e.g., #FF6B00)
      isDefault: i.boolean().optional(), // Mark default watchlist
    }),

    // Individual stock in watchlist
    watchlistStocks: i.entity({
      symbol: i.string().indexed(),
      addedAt: i.number().indexed(),
      notes: i.string().optional(),
      targetPrice: i.number().optional(),
      alertPrice: i.number().optional(),
    }),

    // Research notes for stocks
    researchNotes: i.entity({
      symbol: i.string().indexed(),
      title: i.string(),
      content: i.string(), // Markdown supported
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
      tags: i.string().optional(), // Comma-separated tags
      isFavorite: i.boolean().optional(),
    }),

    // User preferences
    userSettings: i.entity({
      theme: i.string().optional(), // 'dark' | 'light'
      defaultWatchlistId: i.string().optional(),
      apiQuotaWarning: i.boolean().optional(), // Show warning when quota low
      emailAlerts: i.boolean().optional(),
      refreshInterval: i.number().optional(), // Minutes between auto-refresh
    }),
  },

  links: {
    // User -> Watchlists (one-to-many)
    userWatchlists: {
      forward: {
        on: "watchlists",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "watchlists",
      },
    },

    // Watchlist -> Stocks (one-to-many)
    watchlistStocksLink: {
      forward: {
        on: "watchlistStocks",
        has: "one",
        label: "watchlist",
      },
      reverse: {
        on: "watchlists",
        has: "many",
        label: "stocks",
      },
    },

    // User -> Research Notes (one-to-many)
    userResearchNotes: {
      forward: {
        on: "researchNotes",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "researchNotes",
      },
    },

    // User -> Settings (one-to-one)
    userSettingsLink: {
      forward: {
        on: "userSettings",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "settings",
      },
    },
  },
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
