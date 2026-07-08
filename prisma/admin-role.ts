import { PrismaClient } from "@prisma/client";
import type { AppRole } from "@prisma/client";

const prisma = new PrismaClient();
const APP_ROLES: AppRole[] = ["USER", "ADMIN", "SUPER_ADMIN"];

function getArgument(name: string) {
  const flagIndex = process.argv.indexOf(`--${name}`);

  if (flagIndex >= 0) {
    return process.argv[flagIndex + 1];
  }

  const inlineValue = process.argv.find((value) => value.startsWith(`--${name}=`));
  return inlineValue?.slice(name.length + 3);
}

function parseRole(value: string | undefined): AppRole {
  const role = value ?? "SUPER_ADMIN";

  if (!APP_ROLES.includes(role as AppRole)) {
    throw new Error(`Invalid role: ${role}. Use USER, ADMIN, or SUPER_ADMIN.`);
  }

  return role as AppRole;
}

async function main() {
  const email = getArgument("email");
  const role = parseRole(getArgument("role"));

  if (!email) {
    throw new Error("Usage: npm run admin:grant -- --email example@gmail.com --role SUPER_ADMIN");
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error(`User not found: ${email}. Run Google login once before granting admin role.`);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { appRole: role }
  });

  console.log(`Updated: ${updatedUser.email}`);
  console.log(`App role: ${updatedUser.appRole}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
