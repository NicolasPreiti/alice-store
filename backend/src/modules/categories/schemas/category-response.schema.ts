import { z } from "zod";

export const categoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
});
