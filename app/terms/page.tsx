import type { Metadata } from "next";
import { LEGAL_EMAIL, LegalPage, type LegalSection } from "@/app/_components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Smart Budget, your shop account, WhatsApp channel, and payment services.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    paragraphs: [
      "These Terms of Service govern your use of Smart Budget, operated by Smart Budget. By creating an account, connecting a WhatsApp number, or using the dashboard, you agree to these terms.",
      "If you use Smart Budget on behalf of an organization, you confirm that you have authority to accept these terms for that organization. You must be at least 18 years old and legally able to enter into this agreement.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and access",
    paragraphs: [
      "Shop owners can sign in with Google or with an email address and password. Superadmin accounts use Google sign-in only. Keep your credentials private and tell us at " +
        LEGAL_EMAIL +
        " if you believe your account has been compromised.",
      "Access is scoped to your role and shop. We may suspend or restrict access when needed to protect the platform, enforce these terms, meet payment or messaging provider requirements, or comply with the law.",
    ],
  },
  {
    id: "whatsapp",
    title: "Your WhatsApp channel",
    paragraphs: [
      "Each shop connects its own WhatsApp session. Only the shop owner or an authorized representative should scan the QR code, and you must be authorized to use the number you connect.",
      "Smart Budget uses an unofficial WhatsApp gateway. You are responsible for following WhatsApp Business terms, getting permission from customers before messaging them, honoring opt-outs, and complying with local law. WhatsApp restrictions or outages are outside our control.",
      "The AI agent can answer questions and prepare orders, but it can make mistakes. You remain responsible for product details, prices, accepted orders, fulfillment, refunds, and customer service.",
    ],
  },
  {
    id: "payments",
    title: "Orders, payments, and payouts",
    paragraphs: [
      "Subscription plans, limits, and prices are shown in the admin-managed plan table. Platform subscription payments are collected through the payment credentials configured by the platform operator. Your shop payout credentials stay under your control and are stored encrypted, not in plain configuration files.",
      "Smart Budget does not hold customer money. An order is marked paid only when the payment provider callback confirms it. Payment disputes, reversals, and settlement questions are handled between your shop and the payment provider.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Customer data and acceptable use",
    paragraphs: [
      "You must have a lawful basis and provide any required notices before sending customer information to Smart Budget. You grant Smart Budget permission to store, transmit, and process that information only to operate the service you requested.",
      "Do not use Smart Budget to:",
    ],
    bullets: [
      "send spam, unsolicited marketing, or messages to people who opted out;",
      "sell illegal or prohibited goods, impersonate another business, or mislead customers;",
      "harass, threaten, or discriminate against customers or other people;",
      "collect sensitive information such as identity documents, health records, or full card numbers through chat;",
      "scrape the service, bypass usage limits, reverse engineer the platform, or interfere with other shops; or",
      "use the service in a way that violates WhatsApp, PayHero, Daraja, or other provider rules.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    paragraphs: [
      "Smart Budget and its software, design, and documentation remain the property of Smart Budget. You retain ownership of your shop content, customer messages, and product information.",
      "You grant Smart Budget a limited license to host, copy, transmit, and display your content only as needed to provide, secure, and support the service.",
    ],
  },
  {
    id: "availability",
    title: "Availability and changes",
    paragraphs: [
      "We work to keep Smart Budget available, but maintenance, third-party outages, and events outside our control can interrupt service. We do not guarantee uninterrupted WhatsApp or payment provider availability.",
      "We may update plan limits, features, or these terms. Material changes will be posted with a new last-updated date. Continuing to use Smart Budget after a change means you accept the updated terms.",
    ],
  },
  {
    id: "termination",
    title: "Suspension and termination",
    paragraphs: [
      "You can stop using Smart Budget, disconnect your WhatsApp session, and request account deletion at " +
        LEGAL_EMAIL +
        ".",
      "We may suspend or terminate access for breach of these terms, unpaid fees, provider requirements, security risks, or legal reasons. On termination, your right to use Smart Budget ends. Provisions about ownership, disclaimers, liability, and disputes continue to apply.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    paragraphs: [
      "Smart Budget is provided as is. To the extent permitted by law, we do not promise that it will be error-free, uninterrupted, or fit for every purpose, and we are not liable for indirect or consequential loss, lost profit, lost data, or third-party actions.",
      "Nothing in these terms removes liability that cannot lawfully be removed. Your use of WhatsApp, Google sign-in, Resend email, PayHero, and Daraja is also governed by those providers’ own terms.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions or legal notices can be sent to " +
        LEGAL_EMAIL +
        ". Include the email address and shop name linked to your account so we can respond efficiently.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="What you agree to when you create a Smart Budget account, connect a WhatsApp number, or sell through the platform."
      lastUpdated="26 November 2026"
      lastUpdatedIso="2026-11-26"
      sections={sections}
    />
  );
}
