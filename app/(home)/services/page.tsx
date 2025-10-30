import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services - CarWash',
  description: 'Comprehensive car care services and pricing',
};

export default function ServicesPage() {
  const services = [
    {
      name: 'Basic Wash',
      price: '$15',
      features: [
        'Exterior wash and dry',
        'Tire cleaning',
        'Window cleaning',
        'Quick wipe down',
      ],
    },
    {
      name: 'Premium Wash',
      price: '$35',
      features: [
        'Full exterior wash',
        'Interior vacuum',
        'Dashboard cleaning',
        'Tire shine',
        'Door jamb cleaning',
      ],
    },
    {
      name: 'Full Detail',
      price: '$75',
      features: [
        'Complete interior detailing',
        'Exterior waxing',
        'Polish and buff',
        'Engine bay cleaning',
        'Leather conditioning',
        'Carpet shampoo',
      ],
    },
    {
      name: 'Interior Detail',
      price: '$50',
      features: [
        'Deep interior vacuum',
        'Seat cleaning',
        'Dashboard polish',
        'Window cleaning',
        'Carpet shampoo',
      ],
    },
    {
      name: 'Exterior Detail',
      price: '$60',
      features: [
        'Clay bar treatment',
        'Polish and wax',
        'Headlight restoration',
        'Tire shine',
        'Chrome polishing',
      ],
    },
    {
      name: 'Monthly Package',
      price: '$100/month',
      features: [
        '4 premium washes',
        '1 full detail',
        'Priority booking',
        'Discount on add-ons',
      ],
    },
  ];

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

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="p-8 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">{service.name}</h3>
                  <span className="text-2xl font-bold text-primary">
                    {service.price}
                  </span>
                </div>
                <ul className="space-y-2 mt-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-muted-foreground">
                      <span className="mr-2 text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


