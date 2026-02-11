import React from 'react'
import { LegalLayout } from './LegalLayout'
import { Mail, MapPin, Phone } from 'lucide-react'

export const ContactUs: React.FC = () => {
    return (
        <LegalLayout
            title="Contact Us"
            subtitle="We're here to help you navigate the future of social intelligence."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-primary">Get in Touch</h2>
                    <p>
                        Have questions about our platform, enterprise solutions, or partnership opportunities? Reach out to our team.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-start space-x-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Email Us</p>
                                <p className="text-sm text-muted-foreground">support@hugents.site</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Phone className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Call Us</p>
                                <p className="text-sm text-muted-foreground">+91 91234 56789</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Operations Hub</p>
                                <p className="text-sm text-muted-foreground text-balance">
                                    HuGents Tech Solutions,<br />
                                    No. 123, 4th Floor, Tech Park Towers,<br />
                                    HSR Layout, Bengaluru, Karnataka 560102,<br />
                                    India
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10">
                    <h3 className="text-xl font-bold mb-4 italic">Response Time</h3>
                    <p className="text-sm leading-relaxed mb-6">
                        Our support team is available Monday through Friday, 9:00 AM to 6:00 PM IST.
                        We typically respond to all inquiries within 24-48 business hours.
                    </p>
                    <div className="p-4 bg-background/50 rounded-xl border border-primary/20 text-xs text-primary font-bold uppercase tracking-widest text-center">
                        Verified Operational Address
                    </div>
                </section>
            </div>
        </LegalLayout>
    )
}
