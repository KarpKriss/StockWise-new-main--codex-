import LoadingOverlay from '../../components/loaders/LoadingOverlay';
import { useSession } from '../../core/session/AppSession';
import EmptyLocationProcess from './EmptyLocationProcessModern.jsx';
import ManualInventoryProcess from './ManualInventoryProcess.jsx';
import ProcessFlow from './ProcessFlowV2.jsx';
import ProcessStart from './ProcessStartModern.jsx';

export default function ProcessContainer() {
  const { session, loading, processType } = useSession();

  if (loading) {
    return <LoadingOverlay open fullscreen message="Przygotowuje sesje i proces operatora..." />;
  }

  if (!session || !processType) return <ProcessStart />;

  if (processType === 'empty') return <EmptyLocationProcess />;
  if (processType === 'manual') return <ManualInventoryProcess />;

  return <ProcessFlow />;
}
