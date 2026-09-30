import test from "node:test";
import assert from "node:assert/strict";
import { registrationFormSchema, registrationPayload } from "../shared/registration";

const minimal = () => registrationFormSchema.parse({
  email:" Applicant@Example.invalid ",password:"Fictional-test-password",businessType:"retailer",companyName:" Example Shop ",
  primaryContactName:"Example Contact",phoneNumber:"020 0000 0000",billingAddressLine1:"1 Test Street",billingCity:"London",billingPostcode:"SW1A 1AA",billingCountry:"United Kingdom",
});
test("short registration produces the existing API shape and reuses the chosen contact and address",()=>{
  const p=registrationPayload({...minimal(),deliveryAddressLine1:"old hidden address",orderingContactEmail:"old@example.invalid"},{interests:["Beauty & skincare"],useMainEmail:true});
  assert.equal(p.email,"applicant@example.invalid");assert.equal(p.companyName,"Example Shop");assert.equal(p.confirmPassword,p.password);
  assert.equal(p.deliveryAddressLine1,p.billingAddressLine1);assert.equal(p.deliveryCountry,"United Kingdom");assert.equal(p.orderingContactEmail,p.email);assert.equal(p.accountsPayableEmail,p.email);
  assert.equal(p.marketingConsent,false);assert.equal(p.coldChainCapability,false);assert.equal(p.notes,"Product interests: Beauty & skincare");
});
test("separate delivery details must be complete",()=>{
  const p=registrationFormSchema.safeParse({...minimal(),deliverySameAsBilling:false,deliveryAddressLine1:" "});assert.equal(p.success,false);
  if(!p.success)assert.deepEqual(p.error.issues.map(x=>x.path[0]),["deliveryAddressLine1","deliveryCity","deliveryPostcode","deliveryCountry"]);
});
test("detailed applications preserve licences, separate contacts, preferences and notes",()=>{
  const data={...minimal(),businessType:"wholesaler",deliverySameAsBilling:false,deliveryAddressLine1:"2 Warehouse Road",deliveryCity:"Paris",deliveryPostcode:"75001",deliveryCountry:"France",gphcNumber:"TEST-PHARMACY",companyRegistrationNumber:"TEST-CRN",vatNumber:"TEST-VAT",tradingName:"Example Trade",jobTitle:"Buyer",mobileNumber:"020 0000 0001",mhraLicenceType:"TEST",mhraLicenceNumber:"TEST-LICENCE",responsiblePersonName:"Test RP",responsiblePersonEmail:"rp@example.invalid",coldChainCapability:true,interestedInControlledProducts:true,orderingContactEmail:"orders@example.invalid",accountsPayableEmail:"accounts@example.invalid",estimatedMonthlySpend:"under_5000",preferredOrderMethod:"email",howDidYouHear:"referral",notes:"Please call first.",marketingConsent:true};
  const p=registrationPayload(data,{interests:["OTC & healthcare","unknown","OTC & healthcare"],useMainEmail:false});
  for(const key of Object.keys(data).filter(k=>k!=="notes"))assert.equal(p[key as keyof typeof p],data[key as keyof typeof data]);
  assert.equal(p.notes,"Product interests: OTC & healthcare\n\nPlease call first.");
});
test("short passwords, blank essentials and invalid additional emails cannot pass",()=>{
  for(const patch of [{password:"short"},{companyName:" "},{billingCountry:" "},{email:"broken"},{responsiblePersonEmail:"broken"},{accountsPayableEmail:"broken"}])assert.equal(registrationFormSchema.safeParse({...minimal(),...patch}).success,false);
});
