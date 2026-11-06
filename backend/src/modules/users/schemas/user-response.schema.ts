import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  isActive: z.boolean(),
  // Service maps Prisma Date → ISO string before the serializer runs.
  createdAt: z.string(),
});
