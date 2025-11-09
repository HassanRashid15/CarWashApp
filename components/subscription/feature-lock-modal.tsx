'use client';

import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface FeatureLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan?: string;
  description?: string;
}

export function FeatureLockModal({
  isOpen,
  onClose,
  featureName,
  requiredPlan,
  description,
}: FeatureLockModalProps) {
  const router = useRouter();

  const handleViewPlans = () => {
    onClose();
    router.push('/dashboard/settings?tab=billing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-amber-500/20 p-4 rounded-full">
                  <Lock className="h-12 w-12 text-amber-500" />
                </div>
              </motion.div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              Feature Locked
            </DialogTitle>
            <DialogDescription className="text-center text-lg font-semibold text-amber-600 dark:text-amber-400 mt-2">
              {featureName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground text-center"
            >
              {description || `Unlock this feature by purchasing a subscription plan. Upgrade to access ${featureName} and unlock advanced functionality.`}
            </motion.p>

            {requiredPlan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Available in {requiredPlan} Plan
                </span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 pt-4"
            >
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleViewPlans}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                View Plans
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

