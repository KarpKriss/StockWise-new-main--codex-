import LogisticsLoader from './LogisticsLoader';

export default function StockWiseLoader({ message = 'Trwa logowanie do StockWise...' }) {
  return <LogisticsLoader message={message} />;
}
