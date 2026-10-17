"use client";

import { Modal as HeroUIModal } from "@heroui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./buttonClasses";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * HeroUI modal dialog: focus trap and restore, Escape and outside-press dismissal, scroll lock.
 * `data-modal-open` lets Pip's pilot keep the orb clear of the dialog.
 */
export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <HeroUIModal.Root isOpen={open} onOpenChange={onOpenChange}>
      <HeroUIModal.Backdrop isDismissable className="z-dialog bg-overlay">
        <HeroUIModal.Container placement="center" className="z-dialog p-4">
          <HeroUIModal.Dialog
            data-modal-open="true"
            className={cn("panel-solid relative w-full max-w-lg overflow-hidden rounded-panel p-0 shadow-2xl outline-none", className)}
          >
            <HeroUIModal.Header className="flex items-start gap-3 border-b border-border px-6 py-4">
              <div className="min-w-0 flex-1">
                <HeroUIModal.Heading className="font-display text-lg font-semibold tracking-tight">{title}</HeroUIModal.Heading>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <HeroUIModal.CloseTrigger
                aria-label="Close dialog"
                className={buttonClasses({ variant: "ghost", size: "icon", className: "-mr-2 grid size-8 place-items-center" })}
              >
                <X className="size-4" />
              </HeroUIModal.CloseTrigger>
            </HeroUIModal.Header>
            <HeroUIModal.Body className="p-6">{children}</HeroUIModal.Body>
            {footer && (
              <HeroUIModal.Footer className="flex justify-end gap-3 border-t border-border bg-surface-2/40 px-6 py-4">{footer}</HeroUIModal.Footer>
            )}
          </HeroUIModal.Dialog>
        </HeroUIModal.Container>
      </HeroUIModal.Backdrop>
    </HeroUIModal.Root>
  );
}
