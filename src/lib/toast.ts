import { sileo } from "sileo";

export const toast = {
  success: (title: string) => sileo.success({ title }),
  error: (title: string) => sileo.error({ title }),
  info: (title: string) => sileo.info({ title }),
};
