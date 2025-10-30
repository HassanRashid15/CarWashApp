import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - CarWash',
  description: 'Learn about CarWash and our commitment to excellence',
};

export default function AboutPage() {
  return (
    <div className="pt-16 pb-20">
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              About CarWash
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Excellence in car care since 2010
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Story</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                Founded in 2010, CarWash has been a trusted name in professional car care 
                services for over a decade. What started as a small local business has grown 
                into a comprehensive car care service provider, serving thousands of satisfied 
                customers.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Our mission is simple: to provide exceptional car care services that keep your 
                vehicle looking its best while protecting your investment. We believe that 
                every car deserves to shine, and we're committed to making that happen.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="p-6 rounded-lg border border-border bg-card">
                  <h3 className="font-semibold text-lg mb-2">Quality First</h3>
                  <p className="text-muted-foreground">
                    We use only the finest products and equipment to ensure your vehicle 
                    receives the best care possible.
                  </p>
                </div>
                <div className="p-6 rounded-lg border border-border bg-card">
                  <h3 className="font-semibold text-lg mb-2">Customer Satisfaction</h3>
                  <p className="text-muted-foreground">
                    Your satisfaction is our priority. We stand behind our work with a 
                    satisfaction guarantee.
                  </p>
                </div>
                <div className="p-6 rounded-lg border border-border bg-card">
                  <h3 className="font-semibold text-lg mb-2">Environmental Responsibility</h3>
                  <p className="text-muted-foreground">
                    We use eco-friendly products and water-saving techniques to protect 
                    the environment.
                  </p>
                </div>
                <div className="p-6 rounded-lg border border-border bg-card">
                  <h3 className="font-semibold text-lg mb-2">Professional Team</h3>
                  <p className="text-muted-foreground">
                    Our team consists of trained professionals with years of experience 
                    in car care and detailing.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-4">Why Choose Us?</h2>
              <ul className="space-y-4 text-lg text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-3 text-primary font-bold">•</span>
                  <span>Over 10 years of experience in the industry</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-primary font-bold">•</span>
                  <span>Professional-grade equipment and premium products</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-primary font-bold">•</span>
                  <span>Flexible scheduling to fit your busy lifestyle</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-primary font-bold">•</span>
                  <span>Competitive pricing with no hidden fees</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-primary font-bold">•</span>
                  <span>100% satisfaction guarantee on all services</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


