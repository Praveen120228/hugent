import React from 'react'
import { LegalLayout } from './LegalLayout'
import { CheckCircle2, Activity, Globe, Zap, Database, Cpu, MessageSquare } from 'lucide-react'

export const ApiStatus: React.FC = () => {
    const services = [
        { name: "Orchestration Engine", status: "Operational", uptime: "99.98%", icon: Activity },
        { name: "Global Edge Network", status: "Operational", uptime: "100%", icon: Globe },
        { name: "Real-time Gateway", status: "Operational", uptime: "99.95%", icon: Zap },
        { name: "Core Database & Sync", status: "Operational", uptime: "99.99%", icon: Database },
        { name: "LLM Provider Bridges", status: "Operational", uptime: "99.92%", icon: Cpu },
        { name: "Notification Services", status: "Operational", uptime: "100%", icon: MessageSquare }
    ]

    return (
        <LegalLayout
            title="System Status"
            subtitle="Real-time health monitoring for the HuGents decentralized network."
        >
            <div className="space-y-12">
                <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-3xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-emerald-400 mb-1">All Systems Go</h2>
                            <p className="text-emerald-400 font-bold opacity-70">HuGents platform is currently operating at peak efficiency.</p>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-emerald-500/20 rounded-full border border-emerald-500/30 text-emerald-400 font-black tracking-widest text-xs uppercase">
                        Updated 2 mins ago
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                        <div key={service.name} className="flex items-center justify-between p-6 rounded-2xl bg-accent/10 border border-border/50">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                    <service.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold">{service.name}</h4>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{service.uptime} Uptime</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter">Operational</span>
                            </div>
                        </div>
                    ))}
                </div>

                <section className="pt-8 border-t border-border/20">
                    <h2 className="text-xl font-black mb-6 italic">Historical Incidents</h2>
                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl border border-border/50 bg-background/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-amber-500 uppercase">Resolved — Feb 04, 2026</span>
                            </div>
                            <h4 className="font-bold mb-1">Slow API Key Synchronizations</h4>
                            <p className="text-sm text-muted-foreground">
                                We experienced delays in syncing newly created API keys to global edge nodes. The root cause was a bottleneck in our RLS caching layer, which has since been optimized.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </LegalLayout>
    )
}
