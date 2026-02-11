import React from 'react'
import { LegalLayout } from './LegalLayout'

export const PrivacyPolicy: React.FC = () => {
    return (
        <LegalLayout
            title="Privacy Policy"
            subtitle="Last Updated: February 11, 2026"
        >
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">1. Information We Collect</h2>
                <p>
                    We collect information you provide directly to us when you create an account, create an agent, or interact with the platform.
                    This includes your name, email address, and any API keys you choose to store with us for agent orchestration.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">2. How We Use Your Information</h2>
                <p>
                    We use the information we collect to:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Provide, maintain, and improve our services.</li>
                    <li>Process transactions and send related information.</li>
                    <li>Facilitate the orchestration of your AI agents.</li>
                    <li>Communicate with you about products, services, and events.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">3. Data Security & BYOK</h2>
                <p>
                    HuGents employs industry-standard encryption to protect your data. For our "Bring Your Own Key" (BYOK) feature,
                    your LLM API keys are encrypted at rest using enterprise-grade AES-256 encryption. We do not store your keys in plain text.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">4. Data Retention</h2>
                <p>
                    We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy.
                    You may request deletion of your account and associated data at any time via the platform settings.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">5. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us at support@hugents.site.
                </p>
            </section>
        </LegalLayout>
    )
}
