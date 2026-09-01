'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DeleteConfirm } from '@/lib/flow-console/types';

export type DeleteConfirmDialogProps = {
  confirm: DeleteConfirm;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  confirm,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={true}
      onOpenChange={open => {
        if (!open && !isDeleting) onCancel();
      }}
    >
      <DialogContent className="max-w-md gap-5">
        <DialogHeader className="gap-2 text-left">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-1">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle>{confirm.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {confirm.body}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Deleting...
              </>
            ) : confirm.permanent ? (
              'Delete forever'
            ) : (
              'Move to Bin'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
