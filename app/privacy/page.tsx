import type { Metadata } from "next";
import { LEGAL_EMAIL, LegalPage, type LegalSection } from "@/app/_components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Smart Budget collects, uses, protects, and shares information from shops and their customers.",
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope",
    paragraphs: [
      "This policy explains how Smart Budget, operated by Smart Budget, handles information on the public site, sign-in pages, owner dashboard, APIs, and webhooks. It does not cover the independent practices of Google, WhatsApp, Resend, PayHero, or Daraja.",
      "Questions about this policy can be sent to " +
        LEGAL_EMAIL +
        ".",
    ],
  },
  {
    id: "information",
    title: "Information we collect",
    paragraphs: [
      "We collect only what the service needs to operate:",
    ],
    bullets: [
      "Account details: name, email address, Google account identifier, password hash, role, and account status.",
      "Shop details: business name, products, prices, catalog content, and subscription or plan state.",
      "WhatsApp details: connected phone number, QR and session status, restriction state, contact names, message content, and order-related conversation data.",
      "Payment details: amounts, transaction status, provider references, and plan assignments. Payment provider credentials are stored encrypted and are never written to plain environment files.",
      "Technical details: IP address, browser user agent, essential session cookies, security logs, and audit events.",
      "Support details: emails, messages, and other information you send us when asking for help.",
    ],
  },
  {
    id: "use",
    title: "How we use information",
    paragraphs: [
      "Smart Budget uses this information to run your shop, route WhatsApp messages, generate replies and order details where the AI agent is enabled, process subscription payments, enforce plan limits, detect abuse, respond to support requests, and meet legal obligations.",
      "We do not sell personal information or use shop conversations for third-party advertising. We do not use customer messages to advertise unrelated products to people outside your shop.",
    ],
  },
  {
    id: "sessions",
    title: "WhatsApp sessions and encryption",
    paragraphs: [
      "Every shop gets an isolated OpenWA session that the shop owner scans with their own phone. The session has its own scoped API key and signed webhook, so one shop cannot act as another.",
      "Baileys session state and sensitive credentials are restored and persisted by a state-sync sidecar, then stored in Postgres with AES-256-GCM encryption. Password reset tokens are stored as SHA-256 hashes, and passwords are stored as bcrypt hashes.",
    ],
  },
  {
    id: "sharing",
    title: "When we share information",
    paragraphs: [
      "We share information only with providers that make the service work and only to the extent needed:",
    ],
    bullets: [
      "Google, when you choose Google sign-in, to confirm your identity.",
      "Resend, to deliver account and password reset emails.",
      "PayHero or Daraja, to process platform subscription payments and shop payouts.",
      "Our hosting infrastructure, which runs Postgres, Redis, the web app, and the OpenWA gateway.",
      "Authorities or professional advisers, when disclosure is required by law or needed to protect rights, safety, and security.",
    ],
    paragraphsAfterBullets: [
      "Service providers may process information under their own terms. When a provider processes data outside your country, different privacy laws may apply.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "We keep account, shop, and session information while your account is active and for a reasonable period afterward to handle disputes, security incidents, and legal records. Encrypted backups expire on a rolling schedule.",
      "You can disconnect or forget a WhatsApp session from the owner dashboard. Account deletion requests can be sent to " +
        LEGAL_EMAIL +
        ". Payment, audit, and security records may remain where law or legitimate business needs require them.",
    ],
  },
  {
    id: "choices",
    title: "Your choices",
    paragraphs: [
      "You can update your profile and catalog in the dashboard, reset your password, revoke connected payment credentials, and disconnect WhatsApp sessions. To request access, correction, export, or deletion of personal information, email " +
        LEGAL_EMAIL +
        ".",
      "We may ask for information to verify your identity before acting on a request. We respond within the time required by applicable law.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and tracking",
    paragraphs: [
      "Smart Budget uses essential session cookies to keep you signed in and protect authenticated actions. We do not add advertising or cross-site tracking cookies to the application.",
      "Google sign-in may set its own cookies under Google’s privacy policy. You can block cookies in your browser, but some signed-in features will then stop working.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use role-based access checks, ownership checks on shop data, encrypted credentials, hashed reset tokens, and audit logs. Production deployments are expected to use HTTPS and to keep Postgres, Redis, and OpenWA on an internal network.",
      "No system is perfectly secure. Protect your password, use a dedicated WhatsApp business number, and report suspected misuse to " +
        LEGAL_EMAIL +
        ".",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "Smart Budget is a business tool and is not directed at children under 18. We do not knowingly collect personal information from children. Contact " +
        LEGAL_EMAIL +
        " if you believe a child has provided information.",
    ],
  },
  {
    id: "changes",
    title: "Changes and contact",
    paragraphs: [
      "We may update this policy when the service or legal requirements change. The last-updated date above will change with each revision, and material changes will be communicated through the service where practical.",
      "For privacy questions or requests, email Smart Budget at " +
        LEGAL_EMAIL +
        ".",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="What Smart Budget collects, why it is collected, how it is protected, and what you can request."
      lastUpdated="26 November 2026"
      lastUpdatedIso="2026-11-26"
      sections={sections}
    />
  );
}
