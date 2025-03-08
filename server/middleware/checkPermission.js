import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const checkPermission = (action) => async (req, res, next) => {
  const userId = req.user?.user_id; // Extract user ID from token
  const { page } = req.params; // Page name from request params

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: { role: true },
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  // If user is an Administrator, allow all actions
  if (user.role.name === "Administrator") {
    return next();
  }

  // Fetch permissions for the user's role
  const permission = await prisma.permission.findFirst({
    where: {
      roleId: user.roleId,
      page,
    },
  });

  if (!permission || !permission.actions.includes(action)) {
    return res.status(403).json({ message: "Forbidden: You don't have access" });
  }

  next();
};

export default checkPermission;
