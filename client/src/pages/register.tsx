import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useForm, FormProvider, useFormContext, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft, Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import { apiRequest } from "@/lib/queryClient";
import { registrationFormSchema, registrationPayload, registrationBusinessTypes, registrationInterests, regulatedBusinessTypes, type RegistrationFormData } from "@shared/registration";
import "@/styles/registration.css";

type FieldName = keyof RegistrationFormData;
const businessFields: FieldName[] = ["companyName", "businessType", "primaryContactName", "email", "phoneNumber", "password", "tradingName", "companyRegistrationNumber", "vatNumber", "jobTitle", "mobileNumber"];
const licenceFields: FieldName[] = ["gphcNumber", "mhraLicenceType", "mhraLicenceNumber", "responsiblePersonName", "responsiblePersonEmail", "coldChainCapability", "interestedInControlledProducts"];
const extraFields: FieldName[] = ["tradingName", "companyRegistrationNumber", "vatNumber", "jobTitle", "mobileNumber"];
const preferenceFields: FieldName[] = ["estimatedMonthlySpend", "preferredOrderMethod", "howDidYouHear"];

function Field({ name, label, required, type = "text", autoComplete, placeholder, maxLength = 255, children }: {
  name: FieldName; label: string; required?: boolean; type?: string; autoComplete?: string; placeholder?: string; maxLength?: number; children?: ReactNode;
}) {
  const { register, formState: { errors } } = useFormContext<RegistrationFormData>();
  return <div className="reg-field">
    <label htmlFor={`reg-${name}`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    <div className={children ? "reg-input-action" : undefined}>
      <input id={`reg-${name}`} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={maxLength}
        aria-required={required || undefined} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `reg-${name}-error` : undefined} {...register(name)} />
      {children}
    </div>
    {errors[name] && <p className="reg-error" id={`reg-${name}-error`} role="alert">{String(errors[name]?.message)}</p>}
  </div>;
}
function SelectField({ name, label, options, required }: { name: FieldName; label: string; options: ReadonlyArray<readonly [string, string]>; required?: boolean }) {
  const { register, formState: { errors } } = useFormContext<RegistrationFormData>();
  return <div className="reg-field"><label htmlFor={`reg-${name}`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    <select id={`reg-${name}`} aria-required={required || undefined} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `reg-${name}-error` : undefined} {...register(name)}>
      <option value="">Choose an option</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>{errors[name] && <p id={`reg-${name}-error`} className="reg-error" role="alert">{String(errors[name]?.message)}</p>}
  </div>;
}
function Toggle({ name, children }: { name: "deliverySameAsBilling" | "coldChainCapability" | "interestedInControlledProducts" | "marketingConsent"; children: ReactNode }) {
  const { register } = useFormContext<RegistrationFormData>();
  return <label className="reg-toggle"><input type="checkbox" {...register(name)} /><span>{children}</span></label>;
}
function Details({ title, hint, open, onOpen, children }: { title: string; hint: string; open: boolean; onOpen: (value: boolean) => void; children: ReactNode }) {
  return <details className="reg-details" open={open} onToggle={e => onOpen(e.currentTarget.open)}>
    <summary><span><strong>{title}</strong><small>{hint}</small></span><ChevronDown size={18} /></summary>
    <div className="reg-details-body">{children}</div>
  </details>;
}

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [licenceOpen, setLicenceOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [secondAddressLine, setSecondAddressLine] = useState(false);
  const [useMainEmail, setUseMainEmail] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const [focusField, setFocusField] = useState<FieldName | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema), mode: "onBlur", shouldUnregister: false,
    defaultValues: {
      companyName: "", businessType: "", primaryContactName: "", email: "", phoneNumber: "", password: "",
      tradingName: "", companyRegistrationNumber: "", vatNumber: "", jobTitle: "", mobileNumber: "",
      billingAddressLine1: "", billingAddressLine2: "", billingCity: "", billingPostcode: "", billingCountry: "United Kingdom",
      deliverySameAsBilling: true, deliveryAddressLine1: "", deliveryAddressLine2: "", deliveryCity: "", deliveryPostcode: "", deliveryCountry: "United Kingdom",
      gphcNumber: "", mhraLicenceType: "", mhraLicenceNumber: "", responsiblePersonName: "", responsiblePersonEmail: "",
      coldChainCapability: false, interestedInControlledProducts: false, estimatedMonthlySpend: "", orderingContactEmail: "", accountsPayableEmail: "",
      preferredOrderMethod: "", howDidYouHear: "", notes: "", marketingConsent: false,
    },
  });
  const businessType = form.watch("businessType"), deliverySame = form.watch("deliverySameAsBilling"), email = form.watch("email");
  useEffect(() => { if (regulatedBusinessTypes.includes(businessType) || interests.includes("OTC & healthcare")) setLicenceOpen(true); }, [businessType, interests]);
  useEffect(() => { if (focusField) { form.setFocus(focusField); setFocusField(null); } }, [focusField, step, extraOpen, licenceOpen, preferencesOpen, useMainEmail, form]);
  function goTo(next: number) {
    setStep(next); setError("");
    requestAnimationFrame(() => { stepHeading.current?.focus(); stepHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }
  async function next() { if (await form.trigger(businessFields, { shouldFocus: true })) goTo(1); }
  function showErrors(errors: FieldErrors<RegistrationFormData>) {
    const names = Object.keys(errors) as FieldName[], first = names[0];
    if (!first) return;
    setError("Please check the highlighted details before applying.");
    setStep(businessFields.includes(first) ? 0 : 1);
    if (names.some(x => extraFields.includes(x))) setExtraOpen(true);
    if (names.some(x => licenceFields.includes(x))) setLicenceOpen(true);
    if (names.some(x => preferenceFields.includes(x))) setPreferencesOpen(true);
    if (names.includes("orderingContactEmail") || names.includes("accountsPayableEmail")) setUseMainEmail(false);
    setFocusField(first);
  }
  async function submit(data: RegistrationFormData) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await apiRequest("POST", "/api/auth/register", registrationPayload(data, { interests, useMainEmail }));
      form.reset(); setSuccess(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError((e as Error).message || "We couldn't submit your application. Your details are still here—please try again."); }
    finally { setBusy(false); }
  }
  if (success) return <PublicLayout><PageTracker title="Application received" /><div className="reg-success wrap">
    <span className="reg-success-icon"><Check size={32} /></span><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
    <h1>Thank you.<br />We’ll be in touch.</h1><p>Your trade account application has been received. Our team will review your business details and contact you if anything else is needed.</p>
    <p className="reg-muted">Your account is pending approval. We’ll email you when it’s ready.</p>
    <Link className="btn plum" href="/products">Explore the catalogue <ArrowRight size={17} /></Link>
  </div></PublicLayout>;
  return <PublicLayout><PageTracker title="Apply for a trade account" />
    <div className="reg-page wrap">
      <aside className="reg-intro"><span className="eyebrow">LET’S GROW TOGETHER</span><h1>Your next<br /><em>trade partner.</em></h1>
        <p>Tell us a little about your business. We’ll take it from there.</p>
        <ul><li><Check size={16} />Two short steps</li><li><Check size={16} />One contact. One address.</li><li><Check size={16} />Extra details when relevant</li></ul>
        <div className="reg-signin">Already a partner? <Link href="/login">Sign in <ArrowRight size={14} /></Link></div>
        <small>Every application is reviewed by our team before the trade account is activated.</small>
      </aside>
      <section className="reg-panel" aria-label="Trade account application">
        <nav className="reg-steps" aria-label="Application steps">
          {["Your business", "Trade details"].map((title, i) => <button key={title} type="button" disabled={busy} aria-current={step === i ? "step" : undefined} onClick={() => goTo(i)}><span>{i + 1}</span>{title}</button>)}
        </nav>
        <div className="reg-panel-body"><div className="reg-section-title"><span className="eyebrow">STEP {step + 1} OF 2</span>
          <h2 ref={stepHeading} tabIndex={-1}>{step === 0 ? "A little introduction." : "Make it your account."}</h2>
          <p>{step === 0 ? "The essentials for your trade account. Fields marked * are required." : "Your address, your interests and any details that help us look after you."}</p>
        </div>
        {error && <div className="reg-error-banner" role="alert">{error}</div>}
        <FormProvider {...form}><form noValidate onSubmit={e => { if (step === 0) { e.preventDefault(); void next(); } else void form.handleSubmit(submit, showErrors)(e); }}>
          <fieldset disabled={busy} className="reg-form-fields">
          {step === 0 ? <>
            <Field name="companyName" label="Company / business name" required autoComplete="organization" placeholder="Your legal business name" />
            <SelectField name="businessType" label="Business type" required options={registrationBusinessTypes} />
            <div className="reg-grid"><Field name="primaryContactName" label="Your full name" required autoComplete="name" /><Field name="phoneNumber" label="Phone or mobile" required type="tel" autoComplete="tel" maxLength={50} /></div>
            <Field name="email" label="Business email" required type="email" autoComplete="email" placeholder="you@company.com" />
            <Field name="password" label="Create a password" required type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" maxLength={128}>
              <button type="button" onClick={() => setShowPassword(x => !x)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}<span>{showPassword ? "Hide" : "Show"}</span></button>
            </Field>
            <Details title="Company numbers & extra contacts" hint="Optional · add them now if you have them handy" open={extraOpen} onOpen={setExtraOpen}>
              <Field name="tradingName" label="Trading name, if different" /><div className="reg-grid"><Field name="companyRegistrationNumber" label="Company registration number" maxLength={50} /><Field name="vatNumber" label="VAT number, if registered" maxLength={50} /></div>
              <div className="reg-grid"><Field name="jobTitle" label="Your role" autoComplete="organization-title" maxLength={100} /><Field name="mobileNumber" label="Additional phone / mobile" type="tel" autoComplete="off" maxLength={50} /></div>
            </Details>
          </> : <>
            <Field name="billingAddressLine1" label="Business / billing address" required autoComplete="billing address-line1" placeholder="Building number and street" />
            {secondAddressLine ? <Field name="billingAddressLine2" label="Address line 2" autoComplete="billing address-line2" /> : <button type="button" className="reg-inline-link" onClick={() => setSecondAddressLine(true)}>+ Add address line 2</button>}
            <div className="reg-grid"><Field name="billingCity" label="Town / city" required autoComplete="billing address-level2" maxLength={100} /><Field name="billingPostcode" label="Postcode / ZIP" required autoComplete="billing postal-code" maxLength={20} /></div>
            <Field name="billingCountry" label="Country" required autoComplete="billing country-name" maxLength={100} />
            <Toggle name="deliverySameAsBilling">Deliver to this address too</Toggle>
            {!deliverySame && <div className="reg-inset"><h3>Delivery address</h3><Field name="deliveryAddressLine1" label="Delivery street address" required autoComplete="shipping address-line1" /><Field name="deliveryAddressLine2" label="Delivery address line 2" autoComplete="shipping address-line2" /><div className="reg-grid"><Field name="deliveryCity" label="Delivery town / city" required autoComplete="shipping address-level2" maxLength={100} /><Field name="deliveryPostcode" label="Delivery postcode / ZIP" required autoComplete="shipping postal-code" maxLength={20} /></div><Field name="deliveryCountry" label="Delivery country" required autoComplete="shipping country-name" maxLength={100} /></div>}
            <div className="reg-email-choice"><label className="reg-toggle"><input type="checkbox" checked={useMainEmail} onChange={e => { setUseMainEmail(e.target.checked); if (e.target.checked) { form.setValue("orderingContactEmail", ""); form.setValue("accountsPayableEmail", ""); form.clearErrors(["orderingContactEmail", "accountsPayableEmail"]); } }} /><span>Use my business email for orders and invoices<small>{email || "The email from step 1"}</small></span></label>
              {!useMainEmail && <div className="reg-grid"><Field name="orderingContactEmail" label="Order contact email" type="email" autoComplete="off" /><Field name="accountsPayableEmail" label="Invoice contact email" type="email" autoComplete="off" /></div>}
            </div>
            <div className="reg-interests"><h3>What would you like to source? <small>Optional</small></h3><div className="reg-chips">{registrationInterests.map(interest => <label key={interest}><input type="checkbox" checked={interests.includes(interest)} onChange={e => setInterests(xs => e.target.checked ? [...xs, interest] : xs.filter(x => x !== interest))} /><span>{interest}</span></label>)}</div></div>
            <Details title="Licence & regulated supply details" hint="For relevant businesses and product ranges" open={licenceOpen} onOpen={setLicenceOpen}>
              <p className="reg-muted">Add any applicable details you have. Our team will confirm what’s needed during the account review.</p>
              <Field name="gphcNumber" label="Pharmacy registration / GPhC number, if applicable" maxLength={50} />
              <div className="reg-grid"><Field name="mhraLicenceType" label="Licence type" placeholder="e.g. WDA(H)" maxLength={100} /><Field name="mhraLicenceNumber" label="Licence number" maxLength={100} /></div>
              <div className="reg-grid"><Field name="responsiblePersonName" label="Responsible person’s name" /><Field name="responsiblePersonEmail" label="Responsible person’s email" type="email" autoComplete="off" /></div>
              <Toggle name="coldChainCapability">We can receive and store temperature-sensitive products</Toggle><Toggle name="interestedInControlledProducts">We would like to discuss controlled products</Toggle>
            </Details>
            <Details title="Help us tailor your account" hint="Optional · spend, ordering preferences and referral" open={preferencesOpen} onOpen={setPreferencesOpen}>
              <SelectField name="estimatedMonthlySpend" label="Estimated monthly spend" options={[["under_5000", "Under £5,000"], ["5000_10000", "£5,000–£10,000"], ["10000_25000", "£10,000–£25,000"], ["25000_50000", "£25,000–£50,000"], ["over_50000", "Over £50,000"]]} />
              <SelectField name="preferredOrderMethod" label="Preferred way to order" options={[["platform", "Trade portal"], ["email", "Email"], ["phone", "Phone"], ["account_manager", "Account manager"]]} />
              <SelectField name="howDidYouHear" label="How did you hear about us?" options={[["google", "Search engine"], ["social_media", "Social media"], ["whatsapp", "WhatsApp"], ["referral", "Recommendation"], ["trade_show", "Trade show / exhibition"], ["linkedin", "LinkedIn"], ["industry_publication", "Industry publication"], ["other", "Other"]]} />
            </Details>
            <div className="reg-field"><label htmlFor="reg-notes">Anything else we should know? <small>Optional</small></label><textarea id="reg-notes" rows={2} placeholder="Brands you need, delivery requirements or a question for our team…" maxLength={4000} {...form.register("notes")} /></div>
            <Toggle name="marketingConsent">Send me product news and trade offers <small>Optional. You can unsubscribe at any time.</small></Toggle>
            <p className="reg-terms">By applying, you agree to our <Link href="/terms" target="_blank" rel="noopener noreferrer">terms</Link>. Read our <Link href="/privacy" target="_blank" rel="noopener noreferrer">privacy notice</Link> for how we use your information.</p>
          </>}
          <div className="reg-actions">{step === 1 && <button type="button" className="reg-back" onClick={() => goTo(0)}><ArrowLeft size={16} />Back</button>}
            {step === 0 ? <button type="button" className="btn plum" onClick={() => void next()}>Continue <ArrowRight size={17} /></button> : <button type="submit" className="btn plum" disabled={busy}>{busy ? <><Loader2 className="animate-spin" size={17} />Sending application…</> : <>Apply for a trade account <ArrowRight size={17} /></>}</button>}
          </div><p className="reg-bottom-note">{step === 0 ? "Next: address and trade details. Your account is created when you submit." : "Your application goes to our team for approval."}</p>
          </fieldset>
        </form></FormProvider></div>
      </section>
    </div>
  </PublicLayout>;
}
