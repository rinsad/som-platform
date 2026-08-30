import { useNavigate } from 'react-router-dom';
import { createCapexRequest } from '../../services/capexService';
import { notifySuccess } from '../../utils/toast';
import CapexRequestForm from './CapexRequestForm';

export default function NewCapexRequest() {
  const navigate = useNavigate();

  async function handleSubmit(data) {
    const created = await createCapexRequest(data);
    notifySuccess(`CAPEX request "${created.title}" created.`);
    navigate('/capex?tab=requests', { replace: true });
  }

  return (
    <CapexRequestForm
      onSubmit={handleSubmit}
      onCancel={() => navigate('/capex?tab=requests')}
    />
  );
}
