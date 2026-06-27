import bcrypt from "bcryptjs";
import { getDriver } from "../config/neo4j.js";
import { normalizeRole, ROLES } from "../config/roles.js";
import { signOfficerToken } from "./jwtService.js";

function officerProfile(node) {
  return {
    name: node.name,
    email: node.email,
    branch: node.branch || "Naivasha",
    role: normalizeRole(node.role),
  };
}

export async function findOfficerByEmail(email) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (o:Officer {email: $email}) RETURN o`,
      { email: email.toLowerCase().trim() },
    );
    if (result.records.length === 0) return null;
    return result.records[0].get("o").properties;
  } finally {
    await session.close();
  }
}

export async function loginOfficer(email, password) {
  const officer = await findOfficerByEmail(email);
  if (!officer) return null;

  const valid = await bcrypt.compare(password, officer.password_hash);
  if (!valid) return null;

  const profile = officerProfile(officer);

  return {
    token: signOfficerToken(profile),
    officer: profile,
  };
}

export async function registerOfficer({ name, email, password, branch = "Naivasha", role = ROLES.OFFICER }) {
  const normalized = email.toLowerCase().trim();
  const officerRole = normalizeRole(role);
  const existing = await findOfficerByEmail(normalized);
  if (existing) {
    const err = new Error("An officer account with this email already exists");
    err.code = "EMAIL_EXISTS";
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const session = getDriver().session();

  try {
    const result = await session.run(
      `
      CREATE (o:Officer {
        email: $email,
        name: $name,
        branch: $branch,
        role: $role,
        password_hash: $password_hash,
        created_iso: toString(datetime())
      })
      RETURN o
    `,
      { email: normalized, name, branch, role: officerRole, password_hash },
    );
    const officer = result.records[0].get("o").properties;
    const profile = officerProfile(officer);
    return { token: signOfficerToken(profile), officer: profile };
  } finally {
    await session.close();
  }
}

export async function seedOfficers(officers) {
  const session = getDriver().session();
  try {
    for (const o of officers) {
      const password_hash = await bcrypt.hash(o.password, 10);
      await session.run(
        `
        MERGE (officer:Officer {email: $email})
        SET officer.name = $name,
            officer.branch = $branch,
            officer.role = $role,
            officer.password_hash = $password_hash
      `,
        {
          email: o.email.toLowerCase(),
          name: o.name,
          branch: o.branch,
          role: normalizeRole(o.role),
          password_hash,
        },
      );
    }
  } finally {
    await session.close();
  }
}
