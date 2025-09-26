import {useState, useEffect} from 'react';
import {supabase} from '../lib/supabaseClient'; // adjust path as per your setup

export default function useFacilityFetch(storageKey) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  console.log('datat:::::', data);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const {data, error} = await supabase
        .from('facility')
        .select('*')
        .order('id', {ascending: true});

      if (error) throw error;
      setData(data);
    } catch (err) {
      console.error('Fetch all error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [storageKey]);

  return {data, loading, refetch: fetchAll};
}
