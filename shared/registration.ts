import { z } from "zod";
import { customerRegistrationSchema, type CustomerRegistrationData } from "./schema";

export const registrationBusinessTypes = [
  ["retailer", "Retail shop / health store"], ["online_retailer", "Online retailer"],
  ["pharmacy", "Retail pharmacy"], ["online_pharmacy", "Online pharmacy"],
  ["wholesaler", "Wholesaler"], ["distributor", "Distributor / importer / exporter"],
  ["hospital_pharmacy", "Hospital pharmacy"], ["dispensing_doctor", "Dispensing doctor"],
  ["dental_practice", "Dental practice"], ["care_home", "Care home"],
  ["beauty_business", "Beauty / cosmetics business"], ["other", "Other business"],
] as const;
export const registrationInterests = ["Vitamins & supplements", "Beauty & skincare", "OTC & healthcare", "Sports nutrition", "OasisBiome", "Other products"] as const;
export const regulatedBusinessTypes = ["pharmacy", "online_pharmacy", "hospital_pharmacy", "wholesaler", "dispensing_doctor"];

// Keep the existing API shape while asking for one password and reusing details.
export const registrationFormSchema = customerRegistrationSchema.innerType().omit({ confirmPassword: true }).extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  companyName: z.string().trim().min(1, "Enter your company or business name").max(255),
  primaryContactName: z.string().trim().min(1, "Enter your full name").max(255),
  phoneNumber: z.string().trim().min(1, "Enter a contact telephone number").max(50),
  billingAddressLine1: z.string().trim().min(1, "Enter your business address").max(255),
  billingCity: z.string().trim().min(1, "Enter your town or city").max(100),
  billingPostcode: z.string().trim().min(1, "Enter your postcode or ZIP code").max(20),
  billingCountry: z.string().trim().min(1, "Enter your country").max(100),
}).superRefine((data, ctx) => {
  if (!data.deliverySameAsBilling) {
    for (const [field, label] of [["deliveryAddressLine1", "delivery address"], ["deliveryCity", "delivery town or city"], ["deliveryPostcode", "delivery postcode or ZIP code"], ["deliveryCountry", "delivery country"]] as const) {
      if (!data[field]?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `Enter your ${label}` });
    }
  }
});
export type RegistrationFormData = z.infer<typeof registrationFormSchema>;

export function registrationPayload(data: RegistrationFormData, options: { interests: string[]; useMainEmail: boolean }): CustomerRegistrationData {
  const clean = registrationFormSchema.parse(data);
  const interests = registrationInterests.filter(x => options.interests.includes(x));
  return customerRegistrationSchema.parse({
    ...clean, confirmPassword: clean.password,
    ...(clean.deliverySameAsBilling ? {
      deliveryAddressLine1: clean.billingAddressLine1, deliveryAddressLine2: clean.billingAddressLine2,
      deliveryCity: clean.billingCity, deliveryPostcode: clean.billingPostcode, deliveryCountry: clean.billingCountry,
    } : {}),
    ...(options.useMainEmail ? { orderingContactEmail: clean.email, accountsPayableEmail: clean.email } : {}),
    notes: [interests.length ? `Product interests: ${interests.join("; ")}` : "", clean.notes?.trim()].filter(Boolean).join("\n\n"),
  });
}
