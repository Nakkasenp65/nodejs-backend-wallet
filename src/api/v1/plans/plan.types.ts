import { Choice } from "@prisma/client";

export interface Plan {
  id: string;
  name: Choice;
  displayName: string;
}
