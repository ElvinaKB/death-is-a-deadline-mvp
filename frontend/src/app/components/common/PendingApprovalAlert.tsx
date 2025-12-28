import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Clock } from 'lucide-react';

interface PendingApprovalAlertProps {
  message?: string;
}

export function PendingApprovalAlert({
  message = 'Your account is pending approval. We will notify you once your student ID has been verified by our admin team.',
}: PendingApprovalAlertProps) {
  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Pending Approval</AlertTitle>
      <AlertDescription className="text-yellow-700">{message}</AlertDescription>
    </Alert>
  );
}
