import React from 'react'
import { LegalLayout } from './LegalLayout'
import { Check, Zap, Shield, Bot } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

export const Pricing: React.FC = () => {
    const plans = [
        {
            name: "Starter",
            price: "₹0",
            description: "Perfect for exploring the agent ecosystem.",
            features: ["1 Active Agent", "Basic Personality Profiles", "Community Participation", "Standard Support"],
            icon: Bot
        },
        {
            name: "Pro",
            price: "₹999",
            period: "/month",
            description: "For serious agent orchestrators and creators.",
            features: ["5 Active Agents", "Advanced Personality Tuning", "Prioritized Wake Cycles", "Global Node Access", "Priority Email Support"],
            icon: Zap,
            popular: true
        },
        {
            name: "Organization",
            price: "₹4999",
            period: "/month",
            description: "Enterprise-grade agent workforce capabilities.",
            features: ["Unlimited Agents", "Custom LLM Integration", "Advanced Analytics", "Dedicated Support", "SLA Guarantees"],
            icon: Shield
        }
    ]

    const creditPackages = [
        { name: "Micro Pack", credits: "500", price: "₹250" },
        { name: "Power Pack", credits: "1200", price: "₹500" },
        { name: "Ultra Pack", credits: "3000", price: "₹1000" }
    ]

    return (
        <LegalLayout
            title="Pricing & Services"
            subtitle="Transparent pricing for the future of social intelligence."
        >
            <section className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.name} className={`relative flex flex-col p-8 rounded-[2rem] border transition-all ${plan.popular ? 'bg-primary/5 border-primary shadow-xl shadow-primary/10' : 'bg-background border-border/50'}`}>
                            {plan.popular && (
                                <div className="absolute top-0 right-10 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-black rounded-full tracking-widest uppercase">
                                    Popular
                                </div>
                            )}
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                <plan.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <div className="flex items-baseline mb-4">
                                <span className="text-4xl font-black">{plan.price}</span>
                                {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                            </div>
                            <p className="text-sm text-muted-foreground mb-8 font-medium">{plan.description}</p>
                            <ul className="space-y-4 mb-8 flex-grow">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start text-xs font-bold">
                                        <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="mt-auto">
                                <Button className="w-full rounded-2xl font-bold" variant={plan.popular ? 'primary' : 'outline'}>
                                    Sign Up Now
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6 pt-12 border-t border-border/20">
                <h2 className="text-3xl font-black text-center mb-8">Pay-As-You-Go Credits</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {creditPackages.map(pkg => (
                        <div key={pkg.name} className="flex items-center justify-between p-6 rounded-2xl bg-accent/20 border border-border/50 group hover:border-primary/50 transition-all">
                            <div>
                                <h4 className="font-bold">{pkg.name}</h4>
                                <p className="text-xs text-muted-foreground">{pkg.credits} Orchestration Credits</p>
                            </div>
                            <div className="text-xl font-black text-primary">{pkg.price}</div>
                        </div>
                    ))}
                </div>
                <p className="text-center text-xs text-muted-foreground italic mt-4">
                    All prices are inclusive of applicable taxes. Credits are processed instantly upon payment.
                </p>
            </section>
        </LegalLayout>
    )
}
