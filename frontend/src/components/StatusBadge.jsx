import { cn } from '../lib/utils';

const STATUS_MAP = {
  applied:    { label: 'Applied',    className: 'badge-applied' },
  interview:  { label: 'Interview',  className: 'badge-interview' },
  offer:      { label: 'Offer',      className: 'badge-offer' },
  rejected:   { label: 'Rejected',   className: 'badge-rejected' },
  draft:      { label: 'Draft',      className: 'badge-draft' },
  pending:    { label: 'Pending',    className: 'badge-applied' },
  accepted:   { label: 'Accepted',   className: 'badge-offer' },
  withdrawn:  { label: 'Withdrawn',  className: 'badge-draft' },
};

export function StatusBadge({ status, className }) {
  const key = (status || 'draft').toLowerCase();
  const config = STATUS_MAP[key] ?? { label: status, className: 'badge-draft' };

  return (
    <span className={cn('badge', config.className, className)}>
      {config.label}
    </span>
  );
}
