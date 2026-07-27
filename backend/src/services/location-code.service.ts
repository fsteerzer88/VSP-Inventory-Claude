// Fixed-depth ancestor chain (covers realistic racking hierarchies like
// Room > Rack > Shelf > Bin without needing a recursive SQL query).
export const LOCATION_ANCESTOR_INCLUDE = {
  parentLocation: {
    include: {
      parentLocation: {
        include: {
          parentLocation: {
            include: {
              parentLocation: {
                include: { parentLocation: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

interface LocationWithAncestors {
  code: string;
  parentLocation?: LocationWithAncestors | null;
}

// Builds the human-readable path code, e.g. "LR-01-01" for a bin under
// shelf "01" under rack "LR" - each location keeps its own short `code`,
// this concatenates the chain from the root ancestor down.
export function withFullCode<T extends LocationWithAncestors>(location: T): T & { fullCode: string } {
  const codes: string[] = [];
  let current: LocationWithAncestors | null | undefined = location;
  while (current) {
    codes.unshift(current.code);
    current = current.parentLocation;
  }
  return { ...location, fullCode: codes.join("-") };
}
