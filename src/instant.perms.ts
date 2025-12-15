/**
 * InstantDB Permissions
 *
 * Ensures users can only access their own data
 */

export default {
  watchlists: {
    bind: ["isOwner", "auth.id == data.ref('user').id"],
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
  },
  watchlistStocks: {
    bind: ["isOwner", "auth.id == data.ref('watchlist').ref('user').id"],
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
  },
  researchNotes: {
    bind: ["isOwner", "auth.id == data.ref('user').id"],
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
  },
  userSettings: {
    bind: ["isOwner", "auth.id == data.ref('user').id"],
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
  },
};
