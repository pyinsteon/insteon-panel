import type { HaFormSchema } from "@ha/components/ha-form/types";

export const propertyFormSchema = (schema: HaFormSchema): HaFormSchema => {
  if (!("type" in schema)) {
    return schema;
  }
  if (schema.type === "integer" && schema.valueMin !== undefined && schema.valueMax !== undefined) {
    return {
      name: schema.name,
      required: schema.required,
      selector: { number: { min: schema.valueMin, max: schema.valueMax, mode: "box" } },
    };
  }
  if (schema.type === "boolean") {
    return { name: schema.name, required: schema.required, selector: { boolean: {} } };
  }
  return schema;
};

export const propertyRange = (schema: HaFormSchema): { min: number; max: number } | undefined => {
  if (!("selector" in schema) || !("number" in schema.selector) || !schema.selector.number) {
    return undefined;
  }
  const { min, max } = schema.selector.number;
  return min === undefined || max === undefined ? undefined : { min, max };
};
