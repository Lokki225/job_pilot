"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Trophy, Sparkles, PenLine, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface OfferCongratulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  company: string;
}

export function OfferCongratulationsModal({
  isOpen,
  onClose,
  jobTitle,
  company,
}: OfferCongratulationsModalProps) {
  const router = useRouter();
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  // Trigger confetti when modal opens
  if (isOpen && !hasTriggeredConfetti) {
    setHasTriggeredConfetti(true);
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
      });
    }, 100);
  }

  // Reset confetti state when modal closes
  if (!isOpen && hasTriggeredConfetti) {
    setHasTriggeredConfetti(false);
  }

  const handleShareStory = () => {
    onClose();
    router.push(`/dashboard/community/submit?job=${encodeURIComponent(jobTitle)}&company=${encodeURIComponent(company)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-2xl text-center">
            Congratulations! 🎉
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            You received an offer for{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {jobTitle}
            </span>{" "}
            at{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {company}
            </span>
            !
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Share Your Success Story
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Inspire others by sharing your journey! Your story could help
                  fellow job seekers land their dream roles.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Earn <strong className="text-purple-600 dark:text-purple-400">+200 XP</strong> for sharing your story!</span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleShareStory} className="w-full gap-2">
              <PenLine className="h-4 w-4" />
              Share My Success Story
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
