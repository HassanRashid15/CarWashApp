'use client';

import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface FeatureRestrictionOverlayProps {
  featureName: string;
  requiredPlan?: string;
  description?: string;
}

export function FeatureRestrictionOverlay({
  featureName,
  requiredPlan,
  description,
}: FeatureRestrictionOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md mx-4"
      >
        <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
                <div className="relative bg-amber-500/20 p-4 rounded-full">
                  <Lock className="h-12 w-12 text-amber-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">
                  Feature Locked
                </h3>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {featureName}
                </p>
              </div>

              <p className="text-sm text-muted-foreground max-w-sm">
                {description || `This feature requires a subscription plan. Upgrade to unlock ${featureName} and access advanced functionality.`}
              </p>

              {requiredPlan && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Available in {requiredPlan} Plan
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Link href="/dashboard/settings?tab=billing">
                    View Plans
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


