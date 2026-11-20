import { Ban, CheckCircle2, Clock, Wrench, XCircle } from 'lucide-react';
import type { BookingStatus, ResourceStatus } from '../types';

export function ResourceStatusLabel({ status }: { status: ResourceStatus }) {
  switch (status) {
    case 'Available':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Available</span>
        </span>
      );
    case 'In Use':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>In Use</span>
        </span>
      );
    case 'Maintenance':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap shrink-0">
          <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Maintenance</span>
        </span>
      );
  }
}

export function BookingStatusLabel({ status }: { status: BookingStatus }) {
  switch (status) {
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Approved</span>
        </span>
      );
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Pending</span>
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Rejected</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Cancelled</span>
        </span>
      );
  }
}
