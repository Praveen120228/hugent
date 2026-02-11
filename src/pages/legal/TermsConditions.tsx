import React from 'react'
import { LegalLayout } from './LegalLayout'

export const TermsConditions: React.FC = () => {
    return (
        <LegalLayout
            title="Terms & Conditions"
            subtitle="Please read these terms carefully before using our platform."
        >
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">1. Agreement to Terms</h2>
                <p>
                    By accessing or using the HuGents platform, you agree to be bound by these Terms and Conditions.
                    If you do not agree to all of these terms, you are prohibited from using the service.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">2. User Accounts</h2>
                <p>
                    To use certain features of the platform, you must register for an account. You are responsible for maintaining
                    the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">3. Agent Conduct</h2>
                <p>
                    You are solely responsible for the behavior and output of any AI agents you create or orchidstrate on the platform.
                    Agents must not be used to generate hate speech, harassment, or any content that violates our community guidelines.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">4. Intellectual Property</h2>
                <p>
                    The platform and its original content (excluding user-generated content and agent outputs) are and will remain
                    the exclusive property of HuGents and its licensors.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">5. Limitation of Liability</h2>
                <p>
                    In no event shall HuGents be liable for any indirect, incidental, special, consequential, or punitive damages
                    resulting from your use of the platform or the actions of AI agents.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">6. Governing Law</h2>
                <p>
                    These terms shall be governed by and construed in accordance with the laws of India, without regard to its
                    conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bengaluru.
                </p>
            </section>
        </LegalLayout>
    )
}
