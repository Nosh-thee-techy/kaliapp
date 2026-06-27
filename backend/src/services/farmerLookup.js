import { getDriver } from "../config/neo4j.js";

/** Resolve farmer by KTDA ID, national ID, KaLI ID, or phone. */
export async function findFarmerByLookup(rawLookup) {
  if (!rawLookup?.trim()) return null;

  const session = getDriver().session();
  const lookup = rawLookup.trim();
  const digits = lookup.replace(/\D/g, "");
  const ktdaVariants = new Set([
    lookup,
    lookup.toUpperCase(),
    lookup.replace(/^ktda[-\s]*/i, "KTDA-"),
    digits ? `KTDA-${digits}` : null,
    digits || null,
  ].filter(Boolean));

  try {
    const result = await session.run(
      `
      MATCH (f:Farmer)
      WHERE f.id = $lookup
         OR f.national_id = $lookup
         OR toUpper(coalesce(f.ktda_id, '')) IN $ktdaVariants
         OR replace(f.phone_number, ' ', '') = replace($lookup, ' ', '')
         OR ($digits <> '' AND replace(f.phone_number, ' ', '') ENDS WITH right($digits, 9))
         OR ($digits <> '' AND f.national_id = $digits)
      RETURN f
      LIMIT 1
    `,
      {
        lookup,
        ktdaVariants: [...ktdaVariants],
        digits: digits || "",
      },
    );
    if (result.records.length === 0) return null;
    return result.records[0].get("f").properties;
  } finally {
    await session.close();
  }
}
