import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Skeleton } from "@/components/ui/skeleton";
import type { FooterSection } from "@shared/schema";

const defaultCookieContent = `<section>
<h2>1. What Are Cookies</h2>
<p>Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit our website. They help us recognise your device and remember certain information about your visit, such as your preferences and login status.</p>
</section>

<section>
<h2>2. How We Use Cookies</h2>
<p>Pharma Oasis Limited uses cookies to:</p>
<ul>
<li>Keep you signed into your account during your session</li>
<li>Remember items in your quote basket</li>
<li>Remember your preferences (such as theme settings)</li>
<li>Understand how you use our website to improve our services</li>
<li>Ensure our website functions correctly and securely</li>
</ul>
</section>

<section>
<h2>3. Types of Cookies We Use</h2>
<h3>Essential Cookies</h3>
<p>These cookies are necessary for the website to function properly. They cannot be disabled.</p>
<ul>
<li><strong>connect.sid</strong> - Session authentication (7 days)</li>
<li><strong>quote_basket</strong> - Stores your quote basket items (30 days)</li>
<li><strong>theme</strong> - Remembers your display theme preference (1 year)</li>
</ul>

<h3>Functional Cookies</h3>
<p>These cookies enable enhanced functionality and personalisation.</p>
<ul>
<li><strong>user_preferences</strong> - Stores your site preferences (1 year)</li>
<li><strong>recently_viewed</strong> - Remembers products you have viewed (30 days)</li>
</ul>

<h3>Analytics Cookies</h3>
<p>We may use analytics cookies to understand how visitors interact with our website. This helps us improve our services. These cookies collect information anonymously.</p>
</section>

<section>
<h2>4. Third-Party Cookies</h2>
<p>Our website does not currently use third-party advertising cookies. If we introduce third-party services that set cookies (such as payment processors), we will update this policy accordingly.</p>
</section>

<section>
<h2>5. Managing Cookies</h2>
<p>Most web browsers allow you to control cookies through their settings. You can:</p>
<ul>
<li>View what cookies are stored on your device</li>
<li>Delete individual cookies or all cookies</li>
<li>Block cookies from specific or all websites</li>
<li>Block third-party cookies</li>
<li>Accept all cookies</li>
<li>Receive a notification when a cookie is set</li>
</ul>
<p>Please note that blocking essential cookies may prevent you from using key features of our website, such as logging into your account or adding items to your quote basket.</p>
</section>

<section>
<h2>6. How to Control Cookies in Your Browser</h2>
<ul>
<li><strong>Google Chrome:</strong> Settings > Privacy and security > Cookies and other site data</li>
<li><strong>Mozilla Firefox:</strong> Options > Privacy & Security > Cookies and Site Data</li>
<li><strong>Safari:</strong> Preferences > Privacy > Manage Website Data</li>
<li><strong>Microsoft Edge:</strong> Settings > Cookies and site permissions > Manage and delete cookies</li>
<li><strong>Internet Explorer:</strong> Tools > Internet Options > Privacy > Advanced</li>
</ul>
</section>

<section>
<h2>7. Local Storage</h2>
<p>In addition to cookies, we use browser local storage to save your quote basket and preferences. Local storage works similarly to cookies but can store more data and does not expire automatically. You can clear local storage through your browser settings.</p>
</section>

<section>
<h2>8. Changes to This Policy</h2>
<p>We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. Please check this page periodically for updates. The "Last updated" date at the top of this page indicates when this policy was last revised.</p>
</section>

<section>
<h2>9. Contact Us</h2>
<p>If you have questions about our use of cookies, please contact:</p>
<p><strong>Pharma Oasis Limited</strong><br/>
Unit - J, Doddington Park Farmhouse<br/>
Bridgemere, Nantwich, CW5 7PU<br/>
Email: trade@pharmaoasis.com<br/>
Phone: +44 7481 640640</p>
</section>`;

export default function CookiePolicyPage() {
  const { data: section, isLoading } = useQuery<FooterSection>({
    queryKey: ["/api/footer-sections", "cookie_policy"],
    queryFn: async () => {
      const res = await fetch("/api/footer-sections/cookie_policy");
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    retry: false,
  });

  const content = section?.content || defaultCookieContent;
  const lastUpdated = section?.updatedAt 
    ? new Date(section.updatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "December 2024";

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-cookies">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div 
            className="prose prose-slate dark:prose-invert max-w-none [&_section]:mb-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-3 [&_h3]:mt-4 [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_ul]:space-y-2 [&_li]:text-muted-foreground [&_a]:text-primary [&_a:hover]:underline"
            dangerouslySetInnerHTML={{ __html: content }}
            data-testid="content-cookies"
          />
        )}
      </div>
    </PublicLayout>
  );
}
