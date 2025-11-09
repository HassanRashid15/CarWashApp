'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CreditsData {
  subscription: {
    planType: string;
    status: string;
  } | null;
  usage: {
    customers: number;
    workers: number;
    products: number;
  };
  limits: {
    maxCustomers: number | null;
    maxWorkers: number | null;
    maxProducts: number | null;
  };
}

export function CreditsSection() {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const response = await fetch('/api/subscriptions');
        
        if (response.status === 429) {
          // Rate limited - don't retry immediately
          console.warn('Rate limited on credits fetch');
          setLoading(false);
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          setCreditsData(data);
        }
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
  }, []);

  // Only show for users without a subscription
  if (loading || !creditsData || creditsData.subscription) {
    return null;
  }

  const maxCustomers = creditsData.limits.maxCustomers || 5; // Limit for users without plan (default to 5)
  const customerUsage = creditsData.usage.customers;
  const customerProgress = maxCustomers > 0 ? (customerUsage / maxCustomers) * 100 : 0;
  const remainingCustomers = Math.max(0, maxCustomers - customerUsage);

  // Features available without plan
  const availableFeatures = [
    { name: 'Basic Queue Management', available: true },
    { name: 'Worker Management', available: true },
    { name: 'Basic Reports', available: true },
    { name: `Customer Management (${maxCustomers} max)`, available: true },
    { name: 'Advanced Queue System', available: false },
    { name: 'Payment Processing', available: false },
    { name: 'Advanced Analytics', available: false },
    { name: 'Multi-Location Support', available: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-amber-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Your Credits & Features</CardTitle>
            </div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
              No Plan is Active Now
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Credits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Customer Credits</span>
              </div>
              <span className="text-muted-foreground">
                {customerUsage} / {maxCustomers} used
              </span>
            </div>
            <Progress 
              value={customerProgress} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {remainingCustomers > 0 
                  ? `${remainingCustomers} customer${remainingCustomers !== 1 ? 's' : ''} remaining`
                  : 'No customers remaining'
                }
              </span>
              {customerUsage >= maxCustomers && (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Limit reached
                </span>
              )}
            </div>
          </div>

          {/* Available Features */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-sm font-medium mb-2">Available Features</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  {feature.available ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span className={feature.available ? '' : 'text-muted-foreground line-through'}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="pt-3 border-t border-border">
            <Button asChild className="w-full" variant="default">
              <Link href="/dashboard/settings?tab=billing">
                Select a Plan to Unlock More Features
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

