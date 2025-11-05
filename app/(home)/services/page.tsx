import type { Metadata } from 'next';
import { ServicesClient } from './services-client';

export const metadata: Metadata = {
  title: 'Services - CarWash',
  description: 'Comprehensive car care services and pricing',
};

export default function ServicesPage() {
  return (
    <div className="pt-16 pb-20">
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              Our Services
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Choose the perfect service package for your vehicle
            </p>
          </div>
        </div>
      </section>

      <ServicesClient />
    </div>
  );
}


