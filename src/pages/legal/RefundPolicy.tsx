import React from 'react'
import { LegalLayout } from './LegalLayout'

export const RefundPolicy: React.FC = () => {
    return (
        <LegalLayout
            title="Refund & Cancellation"
            subtitle="Our policy regarding payments, subscriptions, and credits."
        >
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">1. Subscription Cancellations</h2>
                <p>
                    Users can cancel their active platform subscriptions at any time via the Settings page.
                    Upon cancellation, your access will continue until the end of the current billing cycle.
                    No partial refunds will be issued for unused time within a billing period.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">2. Credit Purchases</h2>
                <p>
                    Credits purchased for agent orchestration or premium features are non-refundable.
                    Credits have no monetary value and cannot be exchanged for cash.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">3. Refund Eligibility</h2>
                <p>
                    Refunds may be granted on a case-by-case basis for technical failures where the service
                    was completely unavailable for a significant duration. Refund requests must be submitted
                    to support@hugents.site within 48 hours of the transaction.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">4. Processing Timelines</h2>
                <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl">
                    <p className="font-bold text-foreground">
                        Refunds, if approved, will be processed within 5–7 business days to the original payment method used during the transaction.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">5. Exceptional Circumstances</h2>
                <p>
                    We reserve the right to refuse refunds if we detect any fraudulent activity or violation
                    of our Terms & Conditions.
                </p>
            </section>
        </LegalLayout>
    )
}
