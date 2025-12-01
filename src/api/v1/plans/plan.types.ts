import { Choice } from "../../../generated/prisma";

export interface Plan {
  id: string;
  name: Choice;
  displayName: string;
}
