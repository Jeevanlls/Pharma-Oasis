import { PublicLayout } from "@/components/layout/public-layout";

export default function CookiePolicyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-cookies">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) 
              when you visit our website. They help us recognise your device and remember certain 
              information about your visit, such as your preferences and login status.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Pharma Oasis Limited uses cookies to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Keep you signed into your account during your session</li>
              <li>Remember items in your quote basket</li>
              <li>Remember your preferences (such as theme settings)</li>
              <li>Understand how you use our website to improve our services</li>
              <li>Ensure our website functions correctly and securely</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold mb-2">Essential Cookies</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  These cookies are necessary for the website to function properly. They cannot be disabled.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Cookie Name</th>
                        <th className="text-left py-2 pr-4">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">connect.sid</td>
                        <td className="py-2 pr-4">Session authentication</td>
                        <td className="py-2">7 days</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">quote_basket</td>
                        <td className="py-2 pr-4">Stores your quote basket items</td>
                        <td className="py-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">theme</td>
                        <td className="py-2 pr-4">Remembers your display theme preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="font-semibold mb-2">Functional Cookies</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  These cookies enable enhanced functionality and personalisation.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Cookie Name</th>
                        <th className="text-left py-2 pr-4">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">user_preferences</td>
                        <td className="py-2 pr-4">Stores your site preferences</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">recently_viewed</td>
                        <td className="py-2 pr-4">Remembers products you have viewed</td>
                        <td className="py-2">30 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="font-semibold mb-2">Analytics Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  We may use analytics cookies to understand how visitors interact with our website. 
                  This helps us improve our services. These cookies collect information anonymously.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website does not currently use third-party advertising cookies. If we introduce 
              third-party services that set cookies (such as payment processors), we will update 
              this policy accordingly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>View what cookies are stored on your device</li>
              <li>Delete individual cookies or all cookies</li>
              <li>Block cookies from specific or all websites</li>
              <li>Block third-party cookies</li>
              <li>Accept all cookies</li>
              <li>Receive a notification when a cookie is set</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Please note that blocking essential cookies may prevent you from using key features 
              of our website, such as logging into your account or adding items to your quote basket.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. How to Control Cookies in Your Browser</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong>Google Chrome:</strong> Settings &gt; Privacy and security &gt; Cookies and other site data
              </p>
              <p>
                <strong>Mozilla Firefox:</strong> Options &gt; Privacy & Security &gt; Cookies and Site Data
              </p>
              <p>
                <strong>Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data
              </p>
              <p>
                <strong>Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies
              </p>
              <p>
                <strong>Internet Explorer:</strong> Tools &gt; Internet Options &gt; Privacy &gt; Advanced
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              In addition to cookies, we use browser local storage to save your quote basket and 
              preferences. Local storage works similarly to cookies but can store more data and 
              does not expire automatically. You can clear local storage through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices 
              or for legal reasons. Please check this page periodically for updates. The "Last updated" 
              date at the top indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-md">
              <p className="text-sm"><strong>Pharma Oasis Limited</strong></p>
              <p className="text-sm text-muted-foreground">Unit - J, Doddington Park Farmhouse</p>
              <p className="text-sm text-muted-foreground">Bridgemere, Nantwich, CW5 7PU</p>
              <p className="text-sm text-muted-foreground">Email: trade@pharmaoasis.com</p>
              <p className="text-sm text-muted-foreground">Phone: +44 7481 640640</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. More Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For more information about cookies and how to manage them, visit{" "}
              <a 
                href="https://www.allaboutcookies.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                www.allaboutcookies.org
              </a>{" "}
              or the{" "}
              <a 
                href="https://ico.org.uk/for-the-public/online/cookies/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Information Commissioner's Office guidance on cookies
              </a>.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
