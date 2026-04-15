import LogisticsLoader from './LogisticsLoader';

export default function DataFlowLoader({ message = 'Ladowanie danych magazynowych...' }) {
  return <LogisticsLoader message={message} />;
}
